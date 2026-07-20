import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockUpdateSpecChunkUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  updateSpecChunkUseCase: asValue(mockUpdateSpecChunkUseCase),
})

const { createUpdateSpecChunkTool } = await import('../src/mastra/tools/update-spec-chunk.js')
const tool = createUpdateSpecChunkTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

describe('update_spec_chunk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a section by heading', async () => {
    mockUpdateSpecChunkUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      status: 'updated',
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      section_heading: 'Kafka Contract',
      new_content: 'The payment event uses schema v2:\n```json\n{"event": "payment.processed.v2"}\n```',
      updated_by: 'claude-code',
    })

    expect(result).toEqual({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      status: 'updated',
    })
    expect(mockUpdateSpecChunkUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      section_heading: 'Kafka Contract',
      new_content: 'The payment event uses schema v2:\n```json\n{"event": "payment.processed.v2"}\n```',
      updated_by: 'claude-code',
    })
  })

  it('resolves spec by source_type + source_key', async () => {
    mockUpdateSpecChunkUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Kafka Contract',
      status: 'updated',
    })

    await tool.execute!({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      section_heading: 'Kafka Contract',
      new_content: 'Updated content',
      updated_by: 'claude-code',
    })

    expect(mockUpdateSpecChunkUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      section_heading: 'Kafka Contract',
      new_content: 'Updated content',
      updated_by: 'claude-code',
    })
  })

  it('returns not_found when heading does not exist', async () => {
    mockUpdateSpecChunkUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      section: 'Non-existent Section',
      status: 'not_found',
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      section_heading: 'Non-existent Section',
      new_content: 'New content',
      updated_by: 'claude-code',
    })

    expect(result.status).toBe('not_found')
  })

  it('propagates use case errors', async () => {
    mockUpdateSpecChunkUseCase.execute.mockRejectedValue(
      new Error('Spec not found: invalid-id'),
    )

    await expect(
      tool.execute!({
        spec_id: 'invalid-id',
        section_heading: 'Any',
        new_content: 'content',
        updated_by: 'claude-code',
      }),
    ).rejects.toThrow('Spec not found: invalid-id')
  })
})
