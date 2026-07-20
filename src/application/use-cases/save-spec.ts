import type { ISpecRepository, IChangelogRepository, IEmbeddingService } from '../../domain/index.js'
import type { SaveSpecInput, SaveSpecOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  changelogRepository: IChangelogRepository
  embeddingService: IEmbeddingService
}

export class SaveSpecUseCase {
  private readonly specRepository: ISpecRepository
  private readonly changelogRepository: IChangelogRepository
  private readonly embeddingService: IEmbeddingService

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.changelogRepository = deps.changelogRepository
    this.embeddingService = deps.embeddingService
  }

  async execute(input: SaveSpecInput): Promise<SaveSpecOutput> {
    const { source_type, source_key, title, content, updated_by } = input

    const embedding = await this.embeddingService.generateEmbedding(content)

    const result = await this.specRepository.upsert({
      source_type,
      source_key,
      title,
      content,
      embedding,
      updated_by,
    })

    await this.changelogRepository.insert({
      spec_id: result.spec_id,
      task_id: null,
      field: 'content',
      old_value: result.oldContent,
      new_value: content,
      changed_by: updated_by,
    })

    return { spec_id: result.spec_id, title, status: result.status }
  }
}
