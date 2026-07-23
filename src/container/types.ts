import type { AwilixContainer } from 'awilix'
import type { XenovaEmbeddingService } from '../infrastructure/services/xenova-embedding-service.js'
import type { SequelizeSpecRepository } from '../infrastructure/repositories/sequelize-spec-repository.js'
import type { SequelizeTaskRepository } from '../infrastructure/repositories/sequelize-task-repository.js'
import type { SequelizeChangelogRepository } from '../infrastructure/repositories/sequelize-changelog-repository.js'
import type { SaveSpecUseCase } from '../application/use-cases/save-spec.js'
import type { GetFeatureOverviewUseCase } from '../application/use-cases/get-feature-overview.js'
import type { SearchSpecContextUseCase } from '../application/use-cases/search-spec-context.js'
import type { GetRepoTasksUseCase } from '../application/use-cases/get-repo-tasks.js'
import type { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.js'
import type { UpdateSpecChunkUseCase } from '../application/use-cases/update-spec-chunk.js'
import type { ListCardDocumentsUseCase } from '../application/use-cases/list-card-documents.js'
import type { GetSectionUseCase } from '../application/use-cases/get-section.js'

export interface Cradle {
  embeddingService: XenovaEmbeddingService
  specRepository: SequelizeSpecRepository
  taskRepository: SequelizeTaskRepository
  changelogRepository: SequelizeChangelogRepository
  saveSpecUseCase: SaveSpecUseCase
  getFeatureOverviewUseCase: GetFeatureOverviewUseCase
  searchSpecContextUseCase: SearchSpecContextUseCase
  getRepoTasksUseCase: GetRepoTasksUseCase
  updateTaskStatusUseCase: UpdateTaskStatusUseCase
  updateSpecChunkUseCase: UpdateSpecChunkUseCase
  listCardDocumentsUseCase: ListCardDocumentsUseCase
  getSectionUseCase: GetSectionUseCase
}

export type AppContainer = AwilixContainer<Cradle>
