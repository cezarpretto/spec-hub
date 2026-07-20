import type { ISpecRepository } from '../../domain/index.js'
import type { GetFeatureOverviewInput, GetFeatureOverviewOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
}

export class GetFeatureOverviewUseCase {
  private readonly specRepository: ISpecRepository

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
  }

  async execute(input: GetFeatureOverviewInput): Promise<GetFeatureOverviewOutput> {
    const specId = await this.resolveSpecId(input)
    const spec = await this.specRepository.findById(specId)
    if (!spec) {
      throw new Error(`Spec not found: ${input.spec_id || `${input.source_type}/${input.source_key}`}`)
    }

    const sections = this.extractHeadings(spec.content)

    return {
      spec_id: spec.id,
      title: spec.title,
      source: {
        type: spec.source_type,
        key: spec.source_key,
      },
      sections,
      updated_at: spec.updated_at.toISOString(),
    }
  }

  private async resolveSpecId(input: GetFeatureOverviewInput): Promise<string> {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id)
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`)
      }
      return spec.id
    }
    throw new Error('Either spec_id or (source_type + source_key) must be provided')
  }

  private async resolveIdentifier(identifier: string): Promise<string> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(identifier)) {
      return identifier
    }
    const colonIdx = identifier.indexOf(':')
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx)
      const source_key = identifier.slice(colonIdx + 1)
      const spec = await this.specRepository.findBySourceKey(source_type, source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`)
      }
      return spec.id
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`)
  }

  private extractHeadings(markdown: string): { heading: string; level: number }[] {
    const headingRegex = /^(##|###) (.+)$/gm
    const sections: { heading: string; level: number }[] = []
    let match: RegExpExecArray | null

    while ((match = headingRegex.exec(markdown)) !== null) {
      sections.push({
        heading: match[2].trim(),
        level: match[1] === '##' ? 2 : 3,
      })
    }

    return sections
  }
}
