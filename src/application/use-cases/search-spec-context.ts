import type { ISpecRepository, IEmbeddingService } from '../../domain/index.js'
import type { SearchSpecContextInput, SearchSpecContextOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  embeddingService: IEmbeddingService
}

export class SearchSpecContextUseCase {
  private readonly specRepository: ISpecRepository
  private readonly embeddingService: IEmbeddingService

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.embeddingService = deps.embeddingService
  }

  async execute(input: SearchSpecContextInput): Promise<SearchSpecContextOutput> {
    const specId = await this.resolveSpecId(input)

    const queryEmbedding = await this.embeddingService.generateEmbedding(input.query)

    const result = await this.specRepository.searchContext({
      specId,
      queryEmbedding,
      queryText: input.query,
      repo: input.repo,
      limit: 3,
    })

    if (!result.title) {
      throw new Error(`Spec not found: ${specId}`)
    }

    return result
  }

  private async resolveSpecId(input: SearchSpecContextInput): Promise<string> {
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
