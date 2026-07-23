export type { Spec, Task, ChangelogEntry } from './entities.js'
export type {
  UpsertSpecParams,
  UpsertSpecResult,
  SearchContextParams,
  SearchMatch,
  SearchContextResult,
  CreateTaskParams,
  ListBySourceKeyResult,
  GetSectionResult,
  IUnitOfWork,
  ISpecRepository,
  ITaskRepository,
  IChangelogRepository,
} from './repositories.js'
export type { IEmbeddingService } from './services.js'
