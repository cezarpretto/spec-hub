import type { IContentConverter } from '../../domain/index.js'
import type { ImportSpecFromJiraInput, SaveSpecOutput } from '../dto.js'
import type { SaveSpecUseCase } from './save-spec.js'

interface Dependencies {
  contentConverter: IContentConverter
  saveSpecUseCase: SaveSpecUseCase
}

export class ImportSpecFromJiraUseCase {
  private readonly contentConverter: IContentConverter
  private readonly saveSpecUseCase: SaveSpecUseCase

  constructor(deps: Dependencies) {
    this.contentConverter = deps.contentConverter
    this.saveSpecUseCase = deps.saveSpecUseCase
  }

  async execute(input: ImportSpecFromJiraInput): Promise<SaveSpecOutput> {
    const descriptionMd = await this.contentConverter.convert(
      input.description,
      input.description_format,
    )

    const commentsMd: string[] = []
    if (input.comments?.length) {
      for (const comment of input.comments) {
        const bodyMd = await this.contentConverter.convert(comment.body, comment.body_format)
        commentsMd.push(`### ${comment.author} · ${comment.created}\n\n${bodyMd}`)
      }
    }

    const content = this.composeSpec(input, descriptionMd, commentsMd)
    const title = input.issue_envelope.fields?.summary ?? input.source_key

    return this.saveSpecUseCase.execute({
      source_type: 'JIRA',
      source_key: input.source_key,
      title,
      content,
      updated_by: input.updated_by,
    })
  }

  private composeSpec(
    input: ImportSpecFromJiraInput,
    descriptionMd: string,
    commentsMd: string[],
  ): string {
    const fields = input.issue_envelope.fields
    const title = fields?.summary ?? input.source_key
    const lines: string[] = [`# ${title}`, '']

    const meta: string[] = [`**Source**: JIRA · ${input.source_key}`]
    if (fields?.status?.name) meta.push(`**Status**: ${fields.status.name}`)
    if (fields?.priority?.name) meta.push(`**Priority**: ${fields.priority.name}`)
    const assignee = fields?.assignee?.displayName ?? fields?.assignee?.emailAddress
    if (assignee) meta.push(`**Assignee**: ${assignee}`)
    const reporter = fields?.reporter?.displayName ?? fields?.reporter?.emailAddress
    if (reporter) meta.push(`**Reporter**: ${reporter}`)
    if (fields?.labels?.length) meta.push(`**Labels**: ${fields.labels.join(', ')}`)
    if (fields?.created) meta.push(`**Created**: ${fields.created}`)
    if (fields?.updated) meta.push(`**Updated**: ${fields.updated}`)

    lines.push(meta.join(' · '), '', '## Description', '', descriptionMd, '')

    if (commentsMd.length) {
      lines.push('## Comments', '', ...commentsMd, '')
    }

    return lines.join('\n')
  }
}
