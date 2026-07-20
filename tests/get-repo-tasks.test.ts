import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockGetRepoTasksUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  getRepoTasksUseCase: asValue(mockGetRepoTasksUseCase),
})

const { createGetRepoTasksTool } = await import('../src/mastra/tools/get-repo-tasks.js')
const tool = createGetRepoTasksTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

const mockTasks = [
  {
    id: 'task-001',
    status: 'pending',
    intent: 'implement-kafka-consumer',
    title: 'Implement Kafka consumer for payment events',
    context_snippet: '```json\n{"event": "payment.processed", "amount": 100}\n```',
  },
  {
    id: 'task-002',
    status: 'in_progress',
    intent: 'add-dlq-handling',
    title: 'Add dead-letter queue handling',
    context_snippet: 'Failed messages go to DLQ topic `payments.dlq`',
  },
]

describe('get_repo_tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns active tasks for a repo by spec_id', async () => {
    mockGetRepoTasksUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      repos: [
        {
          repo: 'service-payments-consumer',
          tasks: mockTasks,
        },
      ],
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      repo: 'service-payments-consumer',
    })

    expect(result.repos).toHaveLength(1)
    expect(result.repos[0].tasks).toHaveLength(2)
    expect(result.repos[0].tasks[0].intent).toBe('implement-kafka-consumer')
    expect(mockGetRepoTasksUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
      repo: 'service-payments-consumer',
    })
  })

  it('returns all repos when repo is omitted', async () => {
    mockGetRepoTasksUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      repos: [
        {
          repo: 'service-payments-consumer',
          tasks: [mockTasks[0]],
        },
        {
          repo: 'api-gateway',
          tasks: [mockTasks[1]],
        },
      ],
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
    })

    expect(result.repos).toHaveLength(2)
    expect(result.repos[0].repo).toBe('service-payments-consumer')
    expect(result.repos[1].repo).toBe('api-gateway')
    expect(mockGetRepoTasksUseCase.execute).toHaveBeenCalledWith({
      spec_id: mockSpecId,
    })
  })

  it('resolves spec by source_type + source_key', async () => {
    mockGetRepoTasksUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      repos: [
        { repo: 'service-payments-consumer', tasks: mockTasks },
      ],
    })

    await tool.execute!({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      repo: 'service-payments-consumer',
    })

    expect(mockGetRepoTasksUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
      repo: 'service-payments-consumer',
    })
  })

  it('returns empty repos array when nothing pending', async () => {
    mockGetRepoTasksUseCase.execute.mockResolvedValue({
      spec_id: mockSpecId,
      repos: [],
    })

    const result = await tool.execute!({
      spec_id: mockSpecId,
      repo: 'service-payments-consumer',
    })

    expect(result.repos).toHaveLength(0)
  })

  it('propagates use case errors', async () => {
    mockGetRepoTasksUseCase.execute.mockRejectedValue(
      new Error('Spec not found for JIRA/SHELL-9999'),
    )

    await expect(
      tool.execute!({ source_type: 'JIRA', source_key: 'SHELL-9999' }),
    ).rejects.toThrow('Spec not found for JIRA/SHELL-9999')
  })
})
