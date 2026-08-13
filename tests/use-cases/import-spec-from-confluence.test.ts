import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asClass, asValue } from 'awilix'
import { ImportSpecFromConfluenceUseCase } from '../../src/application/use-cases/import-spec-from-confluence.js'

const mockContentConverter = {
  convert: vi.fn(),
}

const mockSaveSpecUseCase = {
  execute: vi.fn(),
}

const container = createContainer()
container.register({
  contentConverter: asValue(mockContentConverter),
  saveSpecUseCase: asValue(mockSaveSpecUseCase),
  importSpecFromConfluenceUseCase: asClass(ImportSpecFromConfluenceUseCase),
})

const useCase = container.resolve<ImportSpecFromConfluenceUseCase>('importSpecFromConfluenceUseCase')

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

describe('ImportSpecFromConfluenceUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContentConverter.convert.mockResolvedValue('# Converted')
    mockSaveSpecUseCase.execute.mockResolvedValue({
      spec_id: 'spec-1',
      title: 'Engineering Best Practices',
      status: 'created',
    })
  })

  it('renders source, space, version and author in the metadata header', async () => {
    const input = buildInput()
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('**Source**: CONFLUENCE · ENG/page-12345')
    expect(args.content).toContain('**Space**: Engineering')
    expect(args.content).toContain('**Author**: Original Author')
    expect(args.content).toContain('**Version**: 7')
    expect(args.content).toContain('**Created**: 2026-01-15T09:00:00Z')
    expect(args.content).toContain('**Updated**: 2026-08-10T14:30:00Z')
  })

  it('falls back to source_key as title when envelope has no title', async () => {
    const input = buildInput({ page_envelope: { id: '12345' } })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.title).toBe('page-12345')
    expect(args.content).toContain('# page-12345')
  })

  it('omits optional metadata fields when envelope fields are missing', async () => {
    const input = buildInput({ page_envelope: { id: '12345' } })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).not.toContain('**Space**')
    expect(args.content).not.toContain('**Author**')
    expect(args.content).not.toContain('**Version**')
    expect(args.content).not.toContain('**Created**')
    expect(args.content).not.toContain('**Updated**')
  })

  it('uses history.createdBy as author when version.by is missing', async () => {
    const input = buildInput({
      page_envelope: {
        id: '12345',
        title: 'Engineering Best Practices',
        space: { key: 'ENG', name: 'Engineering' },
        history: {
          createdBy: { displayName: 'Original Author' },
          createdDate: '2026-01-15T09:00:00Z',
        },
      },
    })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('**Author**: Original Author')
  })

  it('converts the content with the declared format', async () => {
    const input = buildInput()
    await useCase.execute(input)

    expect(mockContentConverter.convert).toHaveBeenCalledWith(input.content, 'html')
  })

  it('delegates to saveSpecUseCase with source_type CONFLUENCE', async () => {
    const input = buildInput()
    await useCase.execute(input)

    expect(mockSaveSpecUseCase.execute).toHaveBeenCalledTimes(1)
    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.source_type).toBe('CONFLUENCE')
    expect(args.source_key).toBe('page-12345')
    expect(args.title).toBe('Engineering Best Practices')
    expect(args.updated_by).toBe('claude-code')
    expect(args.content).toContain('# Engineering Best Practices')
    expect(args.content).toContain('# Converted')
  })
})
