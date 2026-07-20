import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockGetFeatureOverviewUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  getFeatureOverviewUseCase: asValue(mockGetFeatureOverviewUseCase),
})

const { createGetFeatureOverviewTool } = await import('../src/mastra/tools/get-feature-overview.js')
const tool = createGetFeatureOverviewTool(container as any)

const mockSpecId = '550e8400-e29b-41d4-a716-446655440000'

const mockOutput = {
  spec_id: mockSpecId,
  title: 'Service: User Authentication',
  source: { type: 'JIRA', key: 'SHELL-1010' },
  sections: [
    { heading: 'Architecture', level: 2 },
    { heading: 'Endpoints', level: 3 },
  ],
  updated_at: '2025-07-20T10:00:00.000Z',
}

describe('get_feature_overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns spec metadata by spec_id', async () => {
    mockGetFeatureOverviewUseCase.execute.mockResolvedValue(mockOutput)

    const result = await tool.execute!({ spec_id: mockSpecId })

    expect(result.spec_id).toBe(mockSpecId)
    expect(mockGetFeatureOverviewUseCase.execute).toHaveBeenCalledWith({ spec_id: mockSpecId })
  })

  it('resolves spec by source_type + source_key', async () => {
    mockGetFeatureOverviewUseCase.execute.mockResolvedValue(mockOutput)

    const result = await tool.execute!({ source_type: 'JIRA', source_key: 'SHELL-1010' })

    expect(result.spec_id).toBe(mockSpecId)
    expect(mockGetFeatureOverviewUseCase.execute).toHaveBeenCalledWith({
      source_type: 'JIRA',
      source_key: 'SHELL-1010',
    })
  })

  it('resolves spec via spec_id with SOURCE_TYPE:SOURCE_KEY format', async () => {
    mockGetFeatureOverviewUseCase.execute.mockResolvedValue(mockOutput)

    await tool.execute!({ spec_id: 'JIRA:SHELL-1010' })

    expect(mockGetFeatureOverviewUseCase.execute).toHaveBeenCalledWith({
      spec_id: 'JIRA:SHELL-1010',
    })
  })

  it('propagates not-found error', async () => {
    mockGetFeatureOverviewUseCase.execute.mockRejectedValue(
      new Error('Spec not found for JIRA/SHELL-9999'),
    )

    await expect(
      tool.execute!({ source_type: 'JIRA', source_key: 'SHELL-9999' }),
    ).rejects.toThrow('Spec not found for JIRA/SHELL-9999')
  })
})
