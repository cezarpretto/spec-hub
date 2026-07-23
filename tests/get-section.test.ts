import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockGetSectionUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  getSectionUseCase: asValue(mockGetSectionUseCase),
})

const { createGetSectionTool } = await import('../src/mastra/tools/get-section.js')
const tool = createGetSectionTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

describe('get_section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns full section content when found', async () => {
    mockGetSectionUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      content: '## Kafka Contract\n\nThe payment event schema uses Avro serialization.\n\n```json\n{\n  "type": "record",\n  "name": "PaymentEvent",\n  "fields": [...]\n}\n```',
      status: 'found',
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      section_heading: 'Kafka Contract',
    })

    expect(result.status).toBe('found')
    expect(result.content).toContain('Avro serialization')
    expect(mockGetSectionUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      section_heading: 'Kafka Contract',
    })
  })

  it('returns not_found when heading does not exist', async () => {
    mockGetSectionUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Non-existent Section',
      content: '',
      status: 'not_found',
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      section_heading: 'Non-existent Section',
    })

    expect(result.status).toBe('not_found')
    expect(result.content).toBe('')
  })

  it('resolves spec by source_type + source_key', async () => {
    mockGetSectionUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      content: 'The payment event schema...',
      status: 'found',
    })

    await tool.execute!({
      source_type: 'spec',
      source_key: 'SHELL-1010',
      section_heading: 'Kafka Contract',
    })

    expect(mockGetSectionUseCase.execute).toHaveBeenCalledWith({
      source_type: 'spec',
      source_key: 'SHELL-1010',
      section_heading: 'Kafka Contract',
    })
  })

  it('resolves spec via spec_id with SOURCE_TYPE:SOURCE_KEY format', async () => {
    mockGetSectionUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      content: 'The payment event schema...',
      status: 'found',
    })

    await tool.execute!({
      spec_id: 'spec:SHELL-1010',
      section_heading: 'Kafka Contract',
    })

    expect(mockGetSectionUseCase.execute).toHaveBeenCalledWith({
      spec_id: 'spec:SHELL-1010',
      section_heading: 'Kafka Contract',
    })
  })

  it('propagates errors from use case', async () => {
    mockGetSectionUseCase.execute.mockRejectedValue(
      new Error('Spec not found for spec/SHELL-9999'),
    )

    await expect(
      tool.execute!({ source_type: 'spec', source_key: 'SHELL-9999', section_heading: 'test' }),
    ).rejects.toThrow('Spec not found for spec/SHELL-9999')
  })
})
