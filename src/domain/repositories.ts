import type { Spec, Task, ChangelogEntry } from './entities.js'

export interface UpsertSpecParams {
  source_type: string
  source_key: string
  title: string
  content: string
  embedding: number[]
  updated_by: string
}

export interface UpsertSpecResult {
  spec_id: string
  status: 'created' | 'updated'
  oldContent: string | null
}

export interface SearchContextParams {
  specId: string
  queryEmbedding: number[]
  queryText: string
  repo?: string
  limit: number
}

export interface SearchMatch {
  section: string
  snippet: string
  score: number
}

export interface SearchContextResult {
  spec_id: string
  title: string
  matches: SearchMatch[]
}

export interface ListBySourceKeyResult {
  spec_id: string
  source_type: string
  source_key: string
  title: string
  updated_at: Date
}

export interface GetSectionResult {
  section: string
  content: string
  found: boolean
}

export interface IUnitOfWork {
  transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T>
}

export interface ISpecRepository {
  upsert(params: UpsertSpecParams, tx?: unknown): Promise<UpsertSpecResult>
  findById(id: string): Promise<Spec | null>
  findBySourceKey(sourceType: string, sourceKey: string): Promise<Spec | null>
  listBySourceKey(sourceKey: string): Promise<ListBySourceKeyResult[]>
  searchContext(params: SearchContextParams): Promise<SearchContextResult>
  updateContent(specId: string, content: string, embedding: number[], updatedBy: string, tx?: unknown): Promise<Spec | null>
  getSection(specId: string, heading: string): Promise<GetSectionResult>
}

export interface CreateTaskParams {
  spec_id: string
  status: 'pending' | 'in_progress' | 'done'
  repo: string
  intent: string
  title: string
  context_snippet: string
  updated_by: string
}

export interface ITaskRepository {
  findBySpecAndRepo(specId: string, repo: string): Promise<Task[]>
  findBySpecId(specId: string): Promise<Task[]>
  findById(id: string): Promise<Task | null>
  create(params: CreateTaskParams): Promise<Task>
  updateStatus(taskId: string, status: 'pending' | 'in_progress' | 'done', updatedBy: string): Promise<Task | null>
}

export interface IChangelogRepository {
  insert(entry: Omit<ChangelogEntry, 'id' | 'changed_at'>, tx?: unknown): Promise<void>
}
