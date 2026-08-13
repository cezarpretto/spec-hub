import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  importSpecFromJiraUseCase: asValue(mockUseCase),
})

const { createSaveSpecFromJiraTool } = await import('../src/mastra/tools/save-spec-from-jira.js')
const tool = createSaveSpecFromJiraTool(container as never)

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    source_key: 'PROJ-42',
    issue_envelope: {
      key: 'PROJ-42',
      fields: {
        summary: 'Payment Gateway Integration',
        status: { name: 'In Progress' },
        priority: { name: 'High' },
        assignee: { displayName: 'Cezar Pretto' },
        reporter: { displayName: 'PM' },
        labels: ['payments', 'gateway'],
        created: '2026-08-01T10:00:00Z',
        updated: '2026-08-10T14:30:00Z',
      },
    },
    description: '<p>Integrate Stripe webhook</p>',
    description_format: 'html' as const,
    comments: [
      {
        author: 'Tech Lead',
        body: '# TODO\n\nTrack in sprint',
        body_format: 'markdown' as const,
        created: '2026-08-05T09:00:00Z',
      },
    ],
    updated_by: 'claude-code',
    ...overrides,
  }
}

describe('save_spec_from_jira', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes input to the use case and returns its output', async () => {
    const input = buildInput()
    mockUseCase.execute.mockResolvedValue({
      spec_id: 'spec-1',
      title: input.issue_envelope.fields.summary,
      status: 'created',
    })

    const result = await tool.execute!(input)

    expect(result).toEqual({
      spec_id: 'spec-1',
      title: 'Payment Gateway Integration',
      status: 'created',
    })
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1)
    expect(mockUseCase.execute).toHaveBeenCalledWith(input)
  })

  it('supports ADF format for description', async () => {
    const adf = JSON.stringify({ type: 'doc', version: 1, content: [] })
    const input = buildInput({ description: adf, description_format: 'adf' })
    mockUseCase.execute.mockResolvedValue({ spec_id: 's', title: 't', status: 'updated' })

    await tool.execute!(input)

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ description_format: 'adf', description: adf }),
    )
  })

  it('allows omitting comments', async () => {
    const { comments: _comments, ...input } = buildInput()
    mockUseCase.execute.mockResolvedValue({ spec_id: 's', title: 't', status: 'created' })

    await tool.execute!(input)

    const callArgs = mockUseCase.execute.mock.calls[0][0]
    expect(callArgs).not.toHaveProperty('comments')
    expect(callArgs.source_key).toBe('PROJ-42')
  })

  it('propagates use case errors', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('Embedding failed'))

    await expect(tool.execute!(buildInput())).rejects.toThrow('Embedding failed')
  })
})
