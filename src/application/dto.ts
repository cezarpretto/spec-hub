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

export interface GetSectionInput {
  spec_id?: string
  source_type?: string
  source_key?: string
  section_heading: string
}

export interface GetSectionOutput {
  spec_id: string
  section: string
  content: string
  status: 'found' | 'not_found'
}

export interface ListCardDocumentsInput {
  source_key: string
}

export interface ListCardDocumentsOutput {
  source_key: string
  documents: { spec_id: string; source_type: string; title: string; updated_at: string }[]
}

export interface JiraIssueEnvelope {
  key?: string
  fields?: {
    summary?: string
    status?: { name?: string }
    priority?: { name?: string }
    assignee?: { displayName?: string; emailAddress?: string } | null
    reporter?: { displayName?: string; emailAddress?: string } | null
    labels?: string[]
    created?: string
    updated?: string
  }
}

export interface JiraCommentInput {
  author: string
  body: string
  body_format: 'markdown' | 'adf' | 'html'
  created: string
}

export interface ImportSpecFromJiraInput {
  source_key: string
  issue_envelope: JiraIssueEnvelope
  description: string
  description_format: 'markdown' | 'adf' | 'html'
  comments?: JiraCommentInput[]
  updated_by: string
}

export interface ConfluencePageEnvelope {
  id?: string
  title?: string
  space?: { key?: string; name?: string }
  version?: { number?: number; by?: { displayName?: string }; when?: string }
  history?: { createdBy?: { displayName?: string }; createdDate?: string }
}

export interface ImportSpecFromConfluenceInput {
  source_key: string
  page_envelope: ConfluencePageEnvelope
  content: string
  content_format: 'markdown' | 'html' | 'adf'
  updated_by: string
}
