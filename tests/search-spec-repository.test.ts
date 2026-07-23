import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryTypes } from 'sequelize'

const mocks = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockFindAll: vi.fn(),
}))

vi.mock('../src/infrastructure/database/models/index.js', () => ({
  SpecModel: {
    sequelize: { query: mocks.mockQuery },
  },
  TaskModel: {
    findAll: mocks.mockFindAll,
  },
}))

const { SequelizeSpecRepository } = await import('../src/infrastructure/repositories/sequelize-spec-repository.js')

const specId = '550e8400-e29b-41d4-a716-446655440000'
const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(i * 0.01) * 0.5)

const contentWithSections = `
## Introduction

General overview text with some technical terms about payment processing.

## Kafka Contract

The payment event uses the following schema:
\`\`\`json
{"event": "payment.processed", "amount": 100}
\`\`\`

## Error Handling

Error handling on failure: retry with exponential backoff up to 3 times.
`

function stubDbRow(overrides: Partial<{ vector_score: number; text_score: number; content: string }> = {}) {
  return [{
    id: specId,
    title: 'Feature: Payment Gateway',
    content: overrides.content ?? contentWithSections,
    vector_score: overrides.vector_score ?? 0.85,
    text_score: overrides.text_score ?? 0.42,
  }]
}

describe('SequelizeSpecRepository.searchContext', () => {
  let repo: InstanceType<typeof SequelizeSpecRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SequelizeSpecRepository()
  })

  it('executes hybrid SQL with pgvector cosine distance and ts_rank', async () => {
    mocks.mockQuery.mockResolvedValue(stubDbRow())

    await repo.searchContext({ specId, queryEmbedding, queryText: 'payment event', limit: 3 })

    const [sql, options] = mocks.mockQuery.mock.calls[0] as [string, { replacements: Record<string, unknown>; type: QueryTypes }]

    expect(sql).toContain('embedding::vector <=> :queryEmbedding::vector')
    expect(sql).toContain("ts_rank(to_tsvector('portuguese', content), plainto_tsquery('portuguese', :queryText))")
    expect(sql).toContain('1 - (embedding::vector <=>')
    expect(options.type).toBe(QueryTypes.SELECT)
    expect(options.replacements.specId).toBe(specId)
    expect(options.replacements.queryEmbedding).toBe(`[${queryEmbedding.join(',')}]`)
    expect(options.replacements.queryText).toBe('payment event')
  })

  it('combines vector_score, text_score, tf_score, and repo_boost', async () => {
    mocks.mockQuery.mockResolvedValue(stubDbRow({ vector_score: 0.9, text_score: 0.3 }))

    const result = await repo.searchContext({ specId, queryEmbedding, queryText: 'payment schema', limit: 3 })

    expect(result.spec_id).toBe(specId)
    expect(result.matches.length).toBeGreaterThan(0)

    const introMatch = result.matches.find(m => m.section === 'Introduction')
    const kafkaMatch = result.matches.find(m => m.section === 'Kafka Contract')

    expect(introMatch).toBeDefined()
    expect(kafkaMatch).toBeDefined()

    // Score formula: vectorScore * 0.3 + textScore * 0.3 + tfScore * 0.4 + repoBoost
    const expectedBase = 0.9 * 0.3 + 0.3 * 0.3
    // "payment" appears in Introduction and Kafka Contract
    // "schema" appears only in Kafka Contract
    expect(kafkaMatch!.score).toBeGreaterThan(introMatch!.score)
    // All scores include at minimum the DB base
    for (const m of result.matches) {
      expect(m.score).toBeGreaterThanOrEqual(expectedBase - 0.01) // floating point tolerance
    }
  })

  it('returns empty matches when spec is not found', async () => {
    mocks.mockQuery.mockResolvedValue([])

    const result = await repo.searchContext({ specId: 'nonexistent-id', queryEmbedding, queryText: 'test', limit: 3 })

    expect(result.spec_id).toBe('nonexistent-id')
    expect(result.title).toBe('')
    expect(result.matches).toEqual([])
  })

  it('handles NULL embedding gracefully (vector_score = 0, text_score works)', async () => {
    mocks.mockQuery.mockResolvedValue(stubDbRow({ vector_score: 0, text_score: 0.55 }))

    const result = await repo.searchContext({ specId, queryEmbedding, queryText: 'error handling', limit: 3 })

    const errorMatch = result.matches.find(m => m.section === 'Error Handling')
    expect(errorMatch).toBeDefined()
    // With vector_score = 0, base is only 0.3 * textScore = 0.165
    // plus TF for "error" and "handling" terms
    expect(errorMatch!.score).toBeGreaterThan(0.1)
  })

  it('handles NULL content_tsv gracefully (text_score = 0, vector_score works)', async () => {
    mocks.mockQuery.mockResolvedValue(stubDbRow({ vector_score: 0.72, text_score: 0 }))

    const result = await repo.searchContext({ specId, queryEmbedding, queryText: 'Kafka schema', limit: 3 })

    expect(result.matches.length).toBeGreaterThan(0)
    // All sections still get scored via tfScore even when text_score = 0
    const kafkaMatch = result.matches.find(m => m.section === 'Kafka Contract')
    expect(kafkaMatch!.score).toBeGreaterThan(0)
    // Base from vector only: 0.72 * 0.3 = 0.216, plus TF
    expect(kafkaMatch!.score).toBeGreaterThanOrEqual(0.2)
  })

  it('applies repo boost when task snippets overlap with query terms and section content', async () => {
    mocks.mockQuery.mockResolvedValue(stubDbRow({ vector_score: 0.5, text_score: 0.3 }))
    mocks.mockFindAll.mockResolvedValue([
      { context_snippet: 'payment event' },
    ])

    const result = await repo.searchContext({
      specId,
      queryEmbedding,
      queryText: 'payment schema',
      repo: 'service-payments',
      limit: 3,
    })

    const kafkaMatch = result.matches.find(m => m.section === 'Kafka Contract')
    expect(kafkaMatch).toBeDefined()

    // repoBoost = 0.3 if taskSnippets include query terms AND section includes snippet prefix
    // Kafka Contract section contains "payment" and "schema" and snippet prefix matches
    const baseScore = 0.5 * 0.3 + 0.3 * 0.3 // = 0.24
    const expectedWithBoost = baseScore + 0.3 // + repo boost
    expect(kafkaMatch!.score).toBeGreaterThanOrEqual(expectedWithBoost)
  })

  it('returns at most limit matches sorted by score descending', async () => {
    const longContent = Array.from({ length: 10 }, (_, i) =>
      `## Section ${i}\n\nContent with unique term ${i} and some shared keywords.`,
    ).join('\n\n')

    mocks.mockQuery.mockResolvedValue(stubDbRow({ vector_score: 0.6, text_score: 0.4, content: longContent }))

    const result = await repo.searchContext({ specId, queryEmbedding, queryText: 'shared keywords', limit: 3 })

    expect(result.matches.length).toBeLessThanOrEqual(3)
    // Scores are in descending order
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score)
    }
  })
})
