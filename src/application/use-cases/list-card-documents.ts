import type { ISpecRepository } from '../../domain/index.js'
import type { ListCardDocumentsInput, ListCardDocumentsOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
}

export class ListCardDocumentsUseCase {
  private readonly specRepository: ISpecRepository

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
  }

  async execute(input: ListCardDocumentsInput): Promise<ListCardDocumentsOutput> {
    const results = await this.specRepository.listBySourceKey(input.source_key)

    return {
      source_key: input.source_key,
      documents: results.map(r => ({
        spec_id: r.spec_id,
        source_type: r.source_type,
        title: r.title,
        updated_at: r.updated_at.toISOString(),
      })),
    }
  }
}
