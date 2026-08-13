import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  importSpecFromConfluenceUseCase: asValue(mockUseCase),
})

const { createSaveSpecFromConfluenceTool } = await import('../src/mastra/tools/save-spec-from-confluence.js')
const tool = createSaveSpecFromConfluenceTool(container as never)

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    source_key: 'page-12345',
    page_envelope: {
      id: '12345',
      title: 'Engineering Best Practices',
      space: { key: 'ENG', name: 'Engineering' },
      version: {
        number: 7,
        by: { displayName: 'Cezar Pretto' },
        when: '2026-08-10T14:30:00Z',
      },
      history: {
        createdBy: { displayName: 'Original Author' },
        createdDate: '2026-01-15T09:00:00Z',
      },
    },
    content: '<h2>Guidelines</h2><p>Always run lint</p>',
    content_format: 'html' as const,
    updated_by: 'claude-code',
    ...overrides,
  }
}

describe('save_spec_from_confluence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes input to the use case and returns its output', async () => {
    const input = buildInput()
    mockUseCase.execute.mockResolvedValue({
      spec_id: 'spec-1',
      title: input.page_envelope.title,
      status: 'created',
    })

    const result = await tool.execute!(input)

    expect(result).toEqual({
      spec_id: 'spec-1',
      title: 'Engineering Best Practices',
      status: 'created',
    })
    expect(mockUseCase.execute).toHaveBeenCalledTimes(1)
    expect(mockUseCase.execute).toHaveBeenCalledWith(input)
  })

  it('supports markdown format for content', async () => {
    const input = buildInput({ content: '# Heading', content_format: 'markdown' })
    mockUseCase.execute.mockResolvedValue({ spec_id: 's', title: 't', status: 'updated' })

    await tool.execute!(input)

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ content_format: 'markdown', content: '# Heading' }),
    )
  })

  it('propagates use case errors', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('Embedding failed'))

    await expect(tool.execute!(buildInput())).rejects.toThrow('Embedding failed')
  })
})
