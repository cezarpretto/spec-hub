import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockSearchSpecContextUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  searchSpecContextUseCase: asValue(mockSearchSpecContextUseCase),
})

const { createSearchSpecContextTool } = await import('../src/mastra/tools/search-spec-context.js')
const tool = createSearchSpecContextTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

const mockMatches = [
  { section: 'Kafka Contract', snippet: 'The payment event schema...', score: 0.87 },
  { section: 'Event Flow', snippet: '1. Producer sends...', score: 0.72 },
]

describe('search_spec_context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns top matches by spec_id', async () => {
    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: mockMatches,
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      query: 'Kafka event schema',
    })

    expect(result.matches).toHaveLength(2)
    expect(mockSearchSpecContextUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      query: 'Kafka event schema',
    })
  })

  it('resolves spec by source_type + source_key', async () => {
    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: mockMatches,
    })

    await tool.execute!({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      query: 'Kafka event schema',
    })

    expect(mockSearchSpecContextUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      query: 'Kafka event schema',
    })
  })

  it('resolves spec via spec_id with SOURCE_TYPE:SOURCE_KEY format', async () => {
    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: mockMatches,
    })

    await tool.execute!({
      spec_id: 'JIRA:SHELL-1010',
      query: 'Kafka event schema',
    })

    expect(mockSearchSpecContextUseCase.execute).toHaveBeenCalledWith({
      spec_id: 'JIRA:SHELL-1010',
      query: 'Kafka event schema',
    })
  })

  it('passes repo option to use case', async () => {
    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: mockMatches,
    })

    await tool.execute!({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      query: 'Kafka event schema',
      repo: 'service-payments-consumer',
    })

    expect(mockSearchSpecContextUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      query: 'Kafka event schema',
      repo: 'service-payments-consumer',
    })
  })

  it('propagates errors from use case', async () => {
    mockSearchSpecContextUseCase.execute.mockRejectedValue(
      new Error('Spec not found for JIRA/SHELL-9999'),
    )

    await expect(
      tool.execute!({ source_type: 'JIRA', source_key: 'SHELL-9999', query: 'test' }),
    ).rejects.toThrow('Spec not found for JIRA/SHELL-9999')
  })

  it('returns empty matches when no sections are relevant', async () => {
    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: [],
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      query: 'nonexistent topic',
    })

    expect(result.title).toBe('Feature: Payment Gateway')
    expect(result.matches).toHaveLength(0)
  })

  it('returns matches with combined scoring from vector, text, TF, and repo boost', async () => {
    const scoredMatches = [
      { section: 'Kafka Contract', snippet: 'The payment event schema...', score: 0.87 },
      { section: 'Event Flow', snippet: '1. Producer sends...', score: 0.72 },
      { section: 'Error Handling', snippet: 'On failure, retry with...', score: 0.45 },
    ]

    mockSearchSpecContextUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      title: 'Feature: Payment Gateway',
      matches: scoredMatches,
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      query: 'payment event schema flow',
      repo: 'service-payments-consumer',
    })

    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].score).toBeGreaterThan(result.matches[1].score)
    expect(result.matches[1].score).toBeGreaterThan(result.matches[2].score)
    expect(mockSearchSpecContextUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      query: 'payment event schema flow',
      repo: 'service-payments-consumer',
    })
  })
})
