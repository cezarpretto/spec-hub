import type { ISpecRepository } from '../../domain/index.js'
import type { GetSectionInput, GetSectionOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
}

export class GetSectionUseCase {
  private readonly specRepository: ISpecRepository

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
  }

  async execute(input: GetSectionInput): Promise<GetSectionOutput> {
    const specId = await this.resolveSpecId(input)

    const result = await this.specRepository.getSection(specId, input.section_heading)

    return {
      spec_id: specId,
      section: result.section,
      content: result.content,
      status: result.found ? 'found' : 'not_found',
    }
  }

  private async resolveSpecId(input: GetSectionInput): Promise<string> {
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
}
