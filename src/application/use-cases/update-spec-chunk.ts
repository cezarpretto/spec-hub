import type { ISpecRepository, IChangelogRepository, IEmbeddingService } from '../../domain/index.js'
import type { UpdateSpecChunkInput, UpdateSpecChunkOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  changelogRepository: IChangelogRepository
  embeddingService: IEmbeddingService
}

export class UpdateSpecChunkUseCase {
  private readonly specRepository: ISpecRepository
  private readonly changelogRepository: IChangelogRepository
  private readonly embeddingService: IEmbeddingService

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.changelogRepository = deps.changelogRepository
    this.embeddingService = deps.embeddingService
  }

  async execute(input: UpdateSpecChunkInput): Promise<UpdateSpecChunkOutput> {
    const specId = await this.resolveSpecId(input)

    const spec = await this.specRepository.findById(specId)
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`)
    }

    const { section, updatedContent, found } = this.replaceSectionByHeading(
      spec.content,
      input.section_heading,
      input.new_content,
    )

    if (!found) {
      return { spec_id: specId, section: input.section_heading, status: 'not_found' }
    }

    const embedding = await this.embeddingService.generateEmbedding(updatedContent)

    await this.specRepository.updateContent(specId, updatedContent, embedding, input.updated_by)

    await this.changelogRepository.insert({
      spec_id: specId,
      task_id: null,
      field: `section:${input.section_heading}`,
      old_value: section,
      new_value: input.new_content,
      changed_by: input.updated_by,
    })

    return { spec_id: specId, section: input.section_heading, status: 'updated' }
  }

  private replaceSectionByHeading(
    content: string,
    heading: string,
    newContent: string,
  ): { section: string; updatedContent: string; found: boolean } {
    const headingPattern = `^#{2,3}\\s+${this.escapeRegex(heading)}\\s*$`
    const headingRegex = new RegExp(headingPattern, 'im')

    const match = content.match(headingRegex)
    if (!match || match.index === undefined) {
      return { section: '', updatedContent: content, found: false }
    }

    const headingLine = match[0]
    const headingEnd = match.index + headingLine.length
    const remaining = content.slice(headingEnd)

    const nextHeadingRegex = /\n(?=#{2,3}\s)/

    const nextHeadingMatch = remaining.match(nextHeadingRegex)
    const sectionEnd = nextHeadingMatch
      ? headingEnd + nextHeadingMatch.index!
      : content.length

    const oldSection = content.slice(match.index, sectionEnd).trim()

    const marker = `__SECTION_MARKER_${Date.now()}__`
    const before = content.slice(0, match.index)
    const after = content.slice(sectionEnd)
    const updatedContent = before + marker + after

    const finalContent = updatedContent.replace(
      marker,
      `${headingLine}\n\n${newContent.trim()}`,
    )

    return { section: oldSection, updatedContent: finalContent, found: true }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private async resolveSpecId(input: UpdateSpecChunkInput): Promise<string> {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id)
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`)
      }
      return spec.id
    }
    throw new Error('Either spec_id or (source_type + source_key) must be provided')
  }

  private async resolveIdentifier(identifier: string): Promise<string> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(identifier)) {
      return identifier
    }
    const colonIdx = identifier.indexOf(':')
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx)
      const source_key = identifier.slice(colonIdx + 1)
      const spec = await this.specRepository.findBySourceKey(source_type, source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`)
      }
      return spec.id
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`)
  }
}
