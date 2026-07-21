export interface SaveSpecInput {
  source_type: string
  source_key: string
  title: string
  content: string
  updated_by: string
}

export interface SaveSpecOutput {
  spec_id: string
  title: string
  status: 'created' | 'updated'
}

export interface GetFeatureOverviewInput {
  spec_id?: string
  source_type?: string
  source_key?: string
}

export interface GetFeatureOverviewOutput {
  spec_id: string
  title: string
  source: { type: string; key: string }
  sections: { heading: string; level: number }[]
  updated_at: string
}

export interface SearchSpecContextInput {
  spec_id?: string
  source_type?: string
  source_key?: string
  query: string
  repo?: string
}

export interface SearchSpecContextOutput {
  spec_id: string
  title: string
  matches: { section: string; snippet: string; score: number }[]
}

export interface GetRepoTasksInput {
  spec_id?: string
  source_type?: string
  source_key?: string
  repo?: string
}

export interface GetRepoTasksOutput {
  spec_id: string
  repos: { repo: string; tasks: { id: string; status: string; intent: string; title: string; context_snippet: string }[] }[]
}

export interface UpdateTaskStatusInput {
  task_id?: string
  spec_id?: string
  source_type?: string
  source_key?: string
  repo: string
  status: 'pending' | 'in_progress' | 'done'
  intent?: string
  title?: string
  context_snippet?: string
  updated_by: string
}

export interface UpdateTaskStatusOutput {
  task_id: string
  status: string
}

export interface UpdateSpecChunkInput {
  spec_id?: string
  source_type?: string
  source_key?: string
  section_heading: string
  new_content: string
  updated_by: string
}

export interface UpdateSpecChunkOutput {
  spec_id: string
  section: string
  status: 'updated' | 'not_found'
}

export interface ListCardDocumentsInput {
  source_key: string
}

export interface ListCardDocumentsOutput {
  source_key: string
  documents: { spec_id: string; source_type: string; title: string; updated_at: string }[]
}
