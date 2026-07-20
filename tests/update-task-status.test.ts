import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockUpdateTaskStatusUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  updateTaskStatusUseCase: asValue(mockUpdateTaskStatusUseCase),
})

const { createUpdateTaskStatusTool } = await import('../src/mastra/tools/update-task-status.js')
const tool = createUpdateTaskStatusTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

describe('update_task_status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates existing task status', async () => {
    mockUpdateTaskStatusUseCase.execute.mockResolvedValue({
      task_id: 'task-001',
      status: 'done',
    })

    const result = await tool.execute!({
      task_id: 'task-001',
      status: 'done',
      repo: 'service-payments-consumer',
      updated_by: 'claude-code',
    })

    expect(result).toEqual({ task_id: 'task-001', status: 'done' })
    expect(mockUpdateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      task_id: 'task-001',
      status: 'done',
      repo: 'service-payments-consumer',
      updated_by: 'claude-code',
    })
  })

  it('creates a new task when task_id is omitted', async () => {
    mockUpdateTaskStatusUseCase.execute.mockResolvedValue({
      task_id: 'task-new-001',
      status: 'pending',
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      repo: 'service-payments-consumer',
      status: 'pending',
      intent: 'add-rate-limiting',
      title: 'Add rate limiting middleware',
      context_snippet: '## Rate Limiting\n\nApply rate limit of 100 req/s',
      updated_by: 'claude-code',
    })

    expect(result).toEqual({ task_id: 'task-new-001', status: 'pending' })
    expect(mockUpdateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      repo: 'service-payments-consumer',
      status: 'pending',
      intent: 'add-rate-limiting',
      title: 'Add rate limiting middleware',
      context_snippet: '## Rate Limiting\n\nApply rate limit of 100 req/s',
      updated_by: 'claude-code',
    })
  })

  it('creates a new task via source_type + source_key', async () => {
    mockUpdateTaskStatusUseCase.execute.mockResolvedValue({
      task_id: 'task-new-002',
      status: 'pending',
    })

    await tool.execute!({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      repo: 'api-gateway',
      status: 'pending',
      intent: 'configure-cors',
      title: 'Configure CORS policies',
      context_snippet: '## CORS\n\nAllow origins: *.corp.com',
      updated_by: 'claude-code',
    })

    expect(mockUpdateTaskStatusUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      repo: 'api-gateway',
      status: 'pending',
      intent: 'configure-cors',
      title: 'Configure CORS policies',
      context_snippet: '## CORS\n\nAllow origins: *.corp.com',
      updated_by: 'claude-code',
    })
  })

  it('propagates use case errors', async () => {
    mockUpdateTaskStatusUseCase.execute.mockRejectedValue(
      new Error('Task not found: task-999'),
    )

    await expect(
      tool.execute!({ task_id: 'task-999', status: 'done', repo: 'any', updated_by: 'claude-code' }),
    ).rejects.toThrow('Task not found: task-999')
  })
})
