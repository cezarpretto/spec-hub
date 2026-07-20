export interface Spec {
  id: string
  source_type: string
  source_key: string
  title: string
  content: string
  embedding: number[] | null
  created_at: Date
  updated_at: Date
  updated_by: string
}

export interface Task {
  id: string
  spec_id: string
  status: 'pending' | 'in_progress' | 'done'
  repo: string
  intent: string
  title: string
  context_snippet: string
  created_at: Date
  updated_at: Date
  updated_by: string
}

export interface ChangelogEntry {
  id: string
  spec_id: string | null
  task_id: string | null
  field: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: Date
}
