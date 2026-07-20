export interface Spec {
  id: string;
  source_type: string;
  source_key: string;
  title: string;
  content: string;
  content_tsv: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface Task {
  id: string;
  spec_id: string;
  status: "pending" | "in_progress" | "done";
  repo: string;
  intent: string;
  title: string;
  context_snippet: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface ChangelogEntry {
  id: string;
  spec_id: string | null;
  task_id: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
}

export interface SaveSpecInput {
  source_type: string;
  source_key: string;
  title: string;
  content: string;
  updated_by: string;
}

export interface SaveSpecOutput {
  spec_id: string;
  title: string;
  status: "created" | "updated";
}

export interface GetFeatureOverviewInput {
  spec_id: string;
}

export interface GetFeatureOverviewOutput {
  spec_id: string;
  title: string;
  source: {
    type: string;
    key: string;
  };
  sections: { heading: string; level: number }[];
  updated_at: string;
}

export interface DbOperations {
  upsertSpec(spec: {
    source_type: string;
    source_key: string;
    title: string;
    content: string;
    embedding: number[];
    updated_by: string;
  }): Promise<{ spec_id: string; status: "created" | "updated" }>;

  getSpecById(specId: string): Promise<{
    id: string;
    source_type: string;
    source_key: string;
    title: string;
    content: string;
    updated_at: string;
  } | null>;

  insertChangelog(entry: {
    spec_id: string | null;
    task_id: string | null;
    field: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string;
  }): Promise<void>;
}

export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}
