import { createContainer, asClass } from 'awilix'
import { XenovaEmbeddingService } from '../infrastructure/services/xenova-embedding-service.js'
import { AdfToMarkdownConverter } from '../infrastructure/services/adf-to-markdown-converter.js'
import { ContentConverter } from '../infrastructure/services/content-converter.js'
import { HtmlToMarkdownConverter } from '../infrastructure/services/html-to-markdown-converter.js'
import { SequelizeSpecRepository } from '../infrastructure/repositories/sequelize-spec-repository.js'
import { SequelizeTaskRepository } from '../infrastructure/repositories/sequelize-task-repository.js'
import { SequelizeChangelogRepository } from '../infrastructure/repositories/sequelize-changelog-repository.js'
import { SequelizeUnitOfWork } from '../infrastructure/repositories/sequelize-unit-of-work.js'
import { SaveSpecUseCase } from '../application/use-cases/save-spec.js'
import { GetFeatureOverviewUseCase } from '../application/use-cases/get-feature-overview.js'
import { SearchSpecContextUseCase } from '../application/use-cases/search-spec-context.js'
import { GetRepoTasksUseCase } from '../application/use-cases/get-repo-tasks.js'
import { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.js'
import { UpdateSpecChunkUseCase } from '../application/use-cases/update-spec-chunk.js'
import { ListCardDocumentsUseCase } from '../application/use-cases/list-card-documents.js'
import { GetSectionUseCase } from '../application/use-cases/get-section.js'
import { ImportSpecFromConfluenceUseCase } from '../application/use-cases/import-spec-from-confluence.js'
import { ImportSpecFromJiraUseCase } from '../application/use-cases/import-spec-from-jira.js'
import type { AppContainer } from './types.js'

export function buildContainer(): AppContainer {
  const container = createContainer()

  container.register({
    embeddingService: asClass(XenovaEmbeddingService).singleton(),

    adfToMarkdownConverter: asClass(AdfToMarkdownConverter).singleton(),
    contentConverter: asClass(ContentConverter).singleton(),
    htmlToMarkdownConverter: asClass(HtmlToMarkdownConverter).singleton(),

    specRepository: asClass(SequelizeSpecRepository).singleton(),
    taskRepository: asClass(SequelizeTaskRepository).singleton(),
    changelogRepository: asClass(SequelizeChangelogRepository).singleton(),
    unitOfWork: asClass(SequelizeUnitOfWork).singleton(),

    saveSpecUseCase: asClass(SaveSpecUseCase).singleton(),
    getFeatureOverviewUseCase: asClass(GetFeatureOverviewUseCase).singleton(),
    searchSpecContextUseCase: asClass(SearchSpecContextUseCase).singleton(),
    getRepoTasksUseCase: asClass(GetRepoTasksUseCase).singleton(),
    updateTaskStatusUseCase: asClass(UpdateTaskStatusUseCase).singleton(),
    updateSpecChunkUseCase: asClass(UpdateSpecChunkUseCase).singleton(),
    listCardDocumentsUseCase: asClass(ListCardDocumentsUseCase).singleton(),
    getSectionUseCase: asClass(GetSectionUseCase).singleton(),

    importSpecFromConfluenceUseCase: asClass(ImportSpecFromConfluenceUseCase).singleton(),
    importSpecFromJiraUseCase: asClass(ImportSpecFromJiraUseCase).singleton(),
  })

  return container as AppContainer
}
