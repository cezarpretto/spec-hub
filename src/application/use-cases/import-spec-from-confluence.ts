import type { IContentConverter } from '../../domain/index.js'
import type { ConfluencePageEnvelope, ImportSpecFromConfluenceInput, SaveSpecOutput } from '../dto.js'
import type { SaveSpecUseCase } from './save-spec.js'

interface Dependencies {
  contentConverter: IContentConverter
  saveSpecUseCase: SaveSpecUseCase
}

export class ImportSpecFromConfluenceUseCase {
  private readonly contentConverter: IContentConverter
  private readonly saveSpecUseCase: SaveSpecUseCase

  constructor(deps: Dependencies) {
    this.contentConverter = deps.contentConverter
    this.saveSpecUseCase = deps.saveSpecUseCase
  }

  async execute(input: ImportSpecFromConfluenceInput): Promise<SaveSpecOutput> {
    const contentMd = await this.contentConverter.convert(
      input.content,
      input.content_format,
    )

    const content = this.composeSpec(input, contentMd)
    const title = input.page_envelope.title ?? input.source_key

    return this.saveSpecUseCase.execute({
      source_type: 'CONFLUENCE',
      source_key: input.source_key,
      title,
      content,
      updated_by: input.updated_by,
    })
  }

  private composeSpec(input: ImportSpecFromConfluenceInput, contentMd: string): string {
    const env: ConfluencePageEnvelope = input.page_envelope
    const title = env.title ?? input.source_key
    const spaceKey = env.space?.key ?? '?'
    const lines: string[] = [`# ${title}`, '']

    const meta: string[] = [`**Source**: CONFLUENCE · ${spaceKey}/${input.source_key}`]
    if (env.space?.name) meta.push(`**Space**: ${env.space.name}`)
    const author = env.history?.createdBy?.displayName ?? env.version?.by?.displayName
    if (author) meta.push(`**Author**: ${author}`)
    if (env.version?.number !== undefined) meta.push(`**Version**: ${env.version.number}`)
    if (env.history?.createdDate) meta.push(`**Created**: ${env.history.createdDate}`)
    if (env.version?.when) meta.push(`**Updated**: ${env.version.when}`)

    lines.push(meta.join(' · '), '', contentMd, '')

    return lines.join('\n')
  }
}
