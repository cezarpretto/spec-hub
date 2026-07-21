import { createContainer, asClass, Lifetime } from 'awilix'
import { XenovaEmbeddingService } from '../infrastructure/services/xenova-embedding-service.js'
import { SequelizeSpecRepository } from '../infrastructure/repositories/sequelize-spec-repository.js'
import { SequelizeTaskRepository } from '../infrastructure/repositories/sequelize-task-repository.js'
import { SequelizeChangelogRepository } from '../infrastructure/repositories/sequelize-changelog-repository.js'
import { SaveSpecUseCase } from '../application/use-cases/save-spec.js'
import { GetFeatureOverviewUseCase } from '../application/use-cases/get-feature-overview.js'
import { SearchSpecContextUseCase } from '../application/use-cases/search-spec-context.js'
import { GetRepoTasksUseCase } from '../application/use-cases/get-repo-tasks.js'
import { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.js'
import { UpdateSpecChunkUseCase } from '../application/use-cases/update-spec-chunk.js'
import { ListCardDocumentsUseCase } from '../application/use-cases/list-card-documents.js'
import type { AppContainer } from './types.js'

export function buildContainer(): AppContainer {
  const container = createContainer()

  container.register({
    embeddingService: asClass(XenovaEmbeddingService).singleton(),

    specRepository: asClass(SequelizeSpecRepository).singleton(),
    taskRepository: asClass(SequelizeTaskRepository).singleton(),
    changelogRepository: asClass(SequelizeChangelogRepository).singleton(),

    saveSpecUseCase: asClass(SaveSpecUseCase).singleton(),
    getFeatureOverviewUseCase: asClass(GetFeatureOverviewUseCase).singleton(),
    searchSpecContextUseCase: asClass(SearchSpecContextUseCase).singleton(),
    getRepoTasksUseCase: asClass(GetRepoTasksUseCase).singleton(),
    updateTaskStatusUseCase: asClass(UpdateTaskStatusUseCase).singleton(),
    updateSpecChunkUseCase: asClass(UpdateSpecChunkUseCase).singleton(),
    listCardDocumentsUseCase: asClass(ListCardDocumentsUseCase).singleton(),
  })

  return container as AppContainer
}
