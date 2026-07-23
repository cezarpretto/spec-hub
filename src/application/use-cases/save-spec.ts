import type { ISpecRepository, IChangelogRepository, IEmbeddingService, IUnitOfWork } from '../../domain/index.js'
import type { SaveSpecInput, SaveSpecOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  changelogRepository: IChangelogRepository
  embeddingService: IEmbeddingService
  unitOfWork: IUnitOfWork
}

export class SaveSpecUseCase {
  private readonly specRepository: ISpecRepository
  private readonly changelogRepository: IChangelogRepository
  private readonly embeddingService: IEmbeddingService
  private readonly unitOfWork: IUnitOfWork

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.changelogRepository = deps.changelogRepository
    this.embeddingService = deps.embeddingService
    this.unitOfWork = deps.unitOfWork
  }

  async execute(input: SaveSpecInput): Promise<SaveSpecOutput> {
    const { source_type, source_key, title, content, updated_by } = input

    const embedding = await this.embeddingService.generateEmbedding(content)

    return this.unitOfWork.transaction(async (tx) => {
      const result = await this.specRepository.upsert({
        source_type,
        source_key,
        title,
        content,
        embedding,
        updated_by,
      }, tx)

      await this.changelogRepository.insert({
        spec_id: result.spec_id,
        task_id: null,
        field: 'content',
        old_value: result.oldContent,
        new_value: content,
        changed_by: updated_by,
      }, tx)

      return { spec_id: result.spec_id, title, status: result.status }
    })
  }
}
