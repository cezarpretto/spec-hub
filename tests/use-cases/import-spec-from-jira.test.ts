import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createContainer, asClass, asValue } from 'awilix'
import { ImportSpecFromJiraUseCase } from '../../src/application/use-cases/import-spec-from-jira.js'

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
  importSpecFromJiraUseCase: asClass(ImportSpecFromJiraUseCase),
})

const useCase = container.resolve<ImportSpecFromJiraUseCase>('importSpecFromJiraUseCase')

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

describe('ImportSpecFromJiraUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContentConverter.convert.mockResolvedValue('# Converted')
    mockSaveSpecUseCase.execute.mockResolvedValue({
      spec_id: 'spec-1',
      title: 'Payment Gateway Integration',
      status: 'created',
    })
  })

  it('renders source and status in the metadata header', async () => {
    const input = buildInput()
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('**Source**: JIRA · PROJ-42')
    expect(args.content).toContain('**Status**: In Progress')
    expect(args.content).toContain('**Priority**: High')
    expect(args.content).toContain('**Assignee**: Cezar Pretto')
    expect(args.content).toContain('**Labels**: payments, gateway')
  })

  it('omits status metadata when the envelope has no status', async () => {
    const input = buildInput({ issue_envelope: { key: 'PROJ-42', fields: {} } })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('**Source**: JIRA · PROJ-42')
    expect(args.content).not.toContain('**Status**')
  })

  it('includes the converted description under ## Description', async () => {
    const input = buildInput()
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('## Description')
    expect(args.content).toContain('# Converted')
  })

  it('renders each comment under ## Comments with author and date', async () => {
    const input = buildInput()
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).toContain('## Comments')
    expect(args.content).toContain('### Tech Lead · 2026-08-05T09:00:00Z')
  })

  it('omits ## Comments when there are no comments', async () => {
    const input = buildInput({ comments: [] })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.content).not.toContain('## Comments')
  })

  it('converts the description and each comment using the declared format', async () => {
    const input = buildInput()
    await useCase.execute(input)

    expect(mockContentConverter.convert).toHaveBeenCalledWith(input.description, 'html')
    expect(mockContentConverter.convert).toHaveBeenCalledWith(
      input.comments[0].body,
      'markdown',
    )
  })

  it('delegates to saveSpecUseCase with source_type JIRA and the composed title', async () => {
    const input = buildInput()
    await useCase.execute(input)

    expect(mockSaveSpecUseCase.execute).toHaveBeenCalledTimes(1)
    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.source_type).toBe('JIRA')
    expect(args.source_key).toBe('PROJ-42')
    expect(args.title).toBe('Payment Gateway Integration')
    expect(args.updated_by).toBe('claude-code')
    expect(args.content).toContain('# Payment Gateway Integration')
  })

  it('falls back to source_key as title when summary is missing', async () => {
    const input = buildInput({ issue_envelope: { key: 'PROJ-42', fields: {} } })
    await useCase.execute(input)

    const args = mockSaveSpecUseCase.execute.mock.calls[0][0]
    expect(args.title).toBe('PROJ-42')
    expect(args.content).toContain('# PROJ-42')
  })
})
