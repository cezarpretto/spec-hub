import type { AwilixContainer } from 'awilix'
import type { XenovaEmbeddingService } from '../infrastructure/services/xenova-embedding-service.js'
import type { AdfToMarkdownConverter } from '../infrastructure/services/adf-to-markdown-converter.js'
import type { ContentConverter } from '../infrastructure/services/content-converter.js'
import type { HtmlToMarkdownConverter } from '../infrastructure/services/html-to-markdown-converter.js'
import type { SequelizeSpecRepository } from '../infrastructure/repositories/sequelize-spec-repository.js'
import type { SequelizeTaskRepository } from '../infrastructure/repositories/sequelize-task-repository.js'
import type { SequelizeChangelogRepository } from '../infrastructure/repositories/sequelize-changelog-repository.js'
import type { SequelizeUnitOfWork } from '../infrastructure/repositories/sequelize-unit-of-work.js'
import type { SaveSpecUseCase } from '../application/use-cases/save-spec.js'
import type { GetFeatureOverviewUseCase } from '../application/use-cases/get-feature-overview.js'
import type { SearchSpecContextUseCase } from '../application/use-cases/search-spec-context.js'
import type { GetRepoTasksUseCase } from '../application/use-cases/get-repo-tasks.js'
import type { UpdateTaskStatusUseCase } from '../application/use-cases/update-task-status.js'
import type { UpdateSpecChunkUseCase } from '../application/use-cases/update-spec-chunk.js'
import type { ListCardDocumentsUseCase } from '../application/use-cases/list-card-documents.js'
import type { GetSectionUseCase } from '../application/use-cases/get-section.js'
import type { ImportSpecFromConfluenceUseCase } from '../application/use-cases/import-spec-from-confluence.js'
import type { ImportSpecFromJiraUseCase } from '../application/use-cases/import-spec-from-jira.js'

export interface Cradle {
  embeddingService: XenovaEmbeddingService
  adfToMarkdownConverter: AdfToMarkdownConverter
  contentConverter: ContentConverter
  htmlToMarkdownConverter: HtmlToMarkdownConverter
  specRepository: SequelizeSpecRepository
  taskRepository: SequelizeTaskRepository
  changelogRepository: SequelizeChangelogRepository
  unitOfWork: SequelizeUnitOfWork
  saveSpecUseCase: SaveSpecUseCase
  getFeatureOverviewUseCase: GetFeatureOverviewUseCase
  searchSpecContextUseCase: SearchSpecContextUseCase
  getRepoTasksUseCase: GetRepoTasksUseCase
  updateTaskStatusUseCase: UpdateTaskStatusUseCase
  updateSpecChunkUseCase: UpdateSpecChunkUseCase
  listCardDocumentsUseCase: ListCardDocumentsUseCase
  getSectionUseCase: GetSectionUseCase
  importSpecFromConfluenceUseCase: ImportSpecFromConfluenceUseCase
  importSpecFromJiraUseCase: ImportSpecFromJiraUseCase
}

export type AppContainer = AwilixContainer<Cradle>
