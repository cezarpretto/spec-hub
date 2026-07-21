import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asValue } from 'awilix'

const mockListCardDocumentsUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  listCardDocumentsUseCase: asValue(mockListCardDocumentsUseCase),
})

const { createListCardDocumentsTool } = await import('../src/mastra/tools/list-card-documents.js')
const tool = createListCardDocumentsTool(container as any)

const mockOutput = {
  source_key: 'SHELL-1234',
  documents: [
    { spec_id: '11111111-1111-1111-1111-111111111111', source_type: 'prd', title: 'PRD: Pagamento via PIX', updated_at: '2026-07-20T10:00:00.000Z' },
    { spec_id: '22222222-2222-2222-2222-222222222222', source_type: 'spec', title: 'Spec Técnica: Pagamento via PIX', updated_at: '2026-07-21T14:00:00.000Z' },
    { spec_id: '33333333-3333-3333-3333-333333333333', source_type: 'design', title: 'Design: Pagamento via PIX', updated_at: '2026-07-21T15:30:00.000Z' },
  ],
}

describe('list_card_documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all documents for a given source_key', async () => {
    mockListCardDocumentsUseCase.execute.mockResolvedValue(mockOutput)

    const result = await tool.execute!({ source_key: 'SHELL-1234' })

    expect(result.source_key).toBe('SHELL-1234')
    expect(result.documents).toHaveLength(3)
    expect(result.documents.map(d => d.source_type)).toEqual(['prd', 'spec', 'design'])
    expect(mockListCardDocumentsUseCase.execute).toHaveBeenCalledWith({ source_key: 'SHELL-1234' })
  })

  it('returns empty documents array when card has no specs', async () => {
    mockListCardDocumentsUseCase.execute.mockResolvedValue({
      source_key: 'SHELL-9999',
      documents: [],
    })

    const result = await tool.execute!({ source_key: 'SHELL-9999' })

    expect(result.documents).toHaveLength(0)
  })

  it('propagates use case errors', async () => {
    mockListCardDocumentsUseCase.execute.mockRejectedValue(
      new Error('Database connection failed'),
    )

    await expect(
      tool.execute!({ source_key: 'SHELL-1234' }),
    ).rejects.toThrow('Database connection failed')
  })
})
