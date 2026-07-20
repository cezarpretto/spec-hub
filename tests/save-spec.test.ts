import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockSaveSpecUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  saveSpecUseCase: asValue(mockSaveSpecUseCase),
})

const { createSaveSpecTool } = await import('../src/mastra/tools/save-spec.js')
const tool = createSaveSpecTool(container as any)

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    source_type: 'JIRA',
    source_key: 'PROJ-42',
    title: 'Feature: Payment Gateway Integration',
    content: '## Overview\n\nThis feature adds a payment gateway integration.\n\n### Kafka Contract\n\nThe payment event uses the following schema:\n```json\n{"event": "payment.processed", "amount": 100}\n```',
    updated_by: 'claude-code',
    ...overrides,
  }
}

describe('save_spec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new spec and returns correct output', async () => {
    const input = buildInput()

    mockSaveSpecUseCase.execute.mockResolvedValue({
      spec_id: '550e8400-e29b-41d4-a716-446655440000',
      title: input.title,
      status: 'created',
    })

    const result = await tool.execute!(input)

    expect(result).toEqual({
      spec_id: '550e8400-e29b-41d4-a716-446655440000',
      title: input.title,
      status: 'created',
    })

    expect(mockSaveSpecUseCase.execute).toHaveBeenCalledTimes(1)
    expect(mockSaveSpecUseCase.execute).toHaveBeenCalledWith(input)
  })

  it('updates an existing spec and returns updated status', async () => {
    const input = buildInput({ title: 'Updated Title' })

    mockSaveSpecUseCase.execute.mockResolvedValue({
      spec_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated Title',
      status: 'updated',
    })

    const result = await tool.execute!(input)

    expect(result).toEqual({
      spec_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated Title',
      status: 'updated',
    })
  })

  it('propagates use case errors', async () => {
    const input = buildInput()

    mockSaveSpecUseCase.execute.mockRejectedValue(new Error('Embedding failed'))

    await expect(tool.execute!(input)).rejects.toThrow('Embedding failed')
    expect(mockSaveSpecUseCase.execute).toHaveBeenCalledTimes(1)
  })
})
