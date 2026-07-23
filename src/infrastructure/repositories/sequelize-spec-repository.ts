import type { ISpecRepository, UpsertSpecParams, UpsertSpecResult, SearchContextParams, SearchContextResult, Spec, ListBySourceKeyResult, GetSectionResult } from '../../domain/index.js'
import { SpecModel, TaskModel } from '../database/models/index.js'

type SpecRow = {
  id: string
  source_type: string
  source_key: string
  title: string
  content: string
  embedding: string | null
  created_at: Date
  updated_at: Date
  updated_by: string
}

export class SequelizeSpecRepository implements ISpecRepository {
  async upsert(params: UpsertSpecParams): Promise<UpsertSpecResult> {
    const existing = await SpecModel.findOne({
      where: { source_type: params.source_type, source_key: params.source_key },
      attributes: ['id', 'content'],
      raw: true,
    })

    const embeddingStr = `[${params.embedding.join(',')}]`

    if (existing) {
      const row = existing as unknown as { id: string; content: string }
      await SpecModel.update(
        { title: params.title, content: params.content, embedding: embeddingStr, updated_by: params.updated_by },
        { where: { id: row.id } },
      )
      return { spec_id: row.id, status: 'updated', oldContent: row.content }
    }

    const created = await SpecModel.create({
      source_type: params.source_type,
      source_key: params.source_key,
      title: params.title,
      content: params.content,
      embedding: embeddingStr,
      updated_by: params.updated_by,
    })

    return { spec_id: created.get('id') as string, status: 'created', oldContent: null }
  }

  async findById(id: string) {
    const row = await SpecModel.findByPk(id, { raw: true }) as unknown as SpecRow | null
    if (!row) return null
    return {
      id: row.id,
      source_type: row.source_type,
      source_key: row.source_key,
      title: row.title,
      content: row.content,
      embedding: row.embedding ? this.fromPgVector(row.embedding) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    }
  }

  async findBySourceKey(sourceType: string, sourceKey: string) {
    const row = await SpecModel.findOne({
      where: { source_type: sourceType, source_key: sourceKey },
      raw: true,
    }) as unknown as SpecRow | null
    if (!row) return null
    return {
      id: row.id,
      source_type: row.source_type,
      source_key: row.source_key,
      title: row.title,
      content: row.content,
      embedding: row.embedding ? this.fromPgVector(row.embedding) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    }
  }

  async listBySourceKey(sourceKey: string): Promise<ListBySourceKeyResult[]> {
    const rows = await SpecModel.findAll({
      where: { source_key: sourceKey },
      attributes: ['id', 'source_type', 'source_key', 'title', 'updated_at'],
      raw: true,
    }) as unknown as { id: string; source_type: string; source_key: string; title: string; updated_at: Date }[]

    return rows.map(r => ({
      spec_id: r.id,
      source_type: r.source_type,
      source_key: r.source_key,
      title: r.title,
      updated_at: r.updated_at,
    }))
  }

  async searchContext(params: SearchContextParams): Promise<SearchContextResult> {
    const row = await SpecModel.findByPk(params.specId, { raw: true }) as unknown as SpecRow | null
    if (!row) {
      return { spec_id: params.specId, title: '', matches: [] }
    }

    const content = row.content
    const title = row.title
    const embedding = row.embedding ? this.fromPgVector(row.embedding) : null

    const similarity = embedding ? this.cosineSimilarity(params.queryEmbedding, embedding) : 0

    const sections = this.splitIntoSections(content)
    const queryTerms = params.queryText.toLowerCase().split(/\s+/).filter(t => t.length > 0)

    const taskSnippets: string[] = []
    if (params.repo) {
      const tasks = await TaskModel.findAll({
        where: { spec_id: params.specId, repo: params.repo },
        attributes: ['context_snippet'],
        raw: true,
      })
      for (const t of tasks) {
        taskSnippets.push(((t as unknown as { context_snippet: string }).context_snippet).toLowerCase())
      }
    }

    const scored = sections.map(section => {
      const sectionLower = section.content.toLowerCase()
      let textScore = 0
      for (const term of queryTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regexMatches = sectionLower.match(new RegExp(escaped, 'g'))
        if (regexMatches) {
          textScore += regexMatches.length
        }
      }
      if (section.content.length > 0) {
        textScore = textScore / Math.log(section.content.length + 1)
      }

      const repoBoost = taskSnippets.some(snip =>
        queryTerms.some(term => snip.includes(term)) &&
        sectionLower.includes(snip.substring(0, Math.min(40, snip.length)))
      ) ? 0.3 : 0

      const score = 0.4 * similarity + 0.6 * textScore + repoBoost

      return {
        section: section.heading,
        snippet: this.truncateSnippet(section.content),
        score: Math.round(score * 100) / 100,
      }
    })

    scored.sort((a, b) => b.score - a.score)

    return {
      spec_id: row.id,
      title,
      matches: scored.slice(0, params.limit),
    }
  }

  async updateContent(specId: string, content: string, embedding: number[], updatedBy: string): Promise<Spec | null> {
    const existing = await SpecModel.findByPk(specId)
    if (!existing) return null

    const embeddingStr = `[${embedding.join(',')}]`

    await existing.update({
      content,
      embedding: embeddingStr,
      updated_by: updatedBy,
    })

    const row = existing.get({ plain: true }) as SpecRow
    return {
      id: row.id,
      source_type: row.source_type,
      source_key: row.source_key,
      title: row.title,
      content: row.content,
      embedding: row.embedding ? this.fromPgVector(row.embedding) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    }
  }

  async getSection(specId: string, heading: string): Promise<GetSectionResult> {
    const row = await SpecModel.findByPk(specId, { raw: true }) as unknown as SpecRow | null
    if (!row) {
      return { section: heading, content: '', found: false }
    }

    const sections = this.splitIntoSections(row.content)
    const match = sections.find(s => s.heading === heading)

    if (!match) {
      return { section: heading, content: '', found: false }
    }

    return { section: match.heading, content: match.content, found: true }
  }

  private fromPgVector(vector: string): number[] {
    return vector.slice(1, -1).split(',').map(Number)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dot / denominator
  }

  private splitIntoSections(content: string): { heading: string; content: string }[] {
    const sections: { heading: string; content: string }[] = []
    const lines = content.split('\n')
    let currentHeading = 'Introduction'
    let currentContent: string[] = []

    for (const line of lines) {
      if (/^#{2,3}\s/.test(line)) {
        if (currentContent.length > 0 || currentHeading !== 'Introduction') {
          sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
        }
        currentHeading = line.replace(/^#{2,3}\s+/, '').trim()
        currentContent = []
      } else {
        currentContent.push(line)
      }
    }

    if (currentContent.length > 0 || sections.length === 0) {
      sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
    }

    return sections
  }

  private truncateSnippet(content: string, maxLen: number = 300): string {
    if (content.length <= maxLen) return content
    return content.slice(0, maxLen - 3) + '...'
  }
}
