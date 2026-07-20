import { query } from "./connection.js";

export async function runMigrations(): Promise<void> {
  await query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  await query(`
    CREATE TABLE IF NOT EXISTS specs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(32) NOT NULL,
      source_key VARCHAR(128) NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
      embedding VECTOR(384),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by VARCHAR(128) NOT NULL,
      UNIQUE (source_type, source_key)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'in_progress', 'done')),
      repo VARCHAR(128) NOT NULL,
      intent VARCHAR(256) NOT NULL,
      title TEXT NOT NULL,
      context_snippet TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by VARCHAR(128) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS changelog (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      spec_id UUID REFERENCES specs(id) ON DELETE SET NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      field VARCHAR(64) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by VARCHAR(128) NOT NULL,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_specs_source
    ON specs (source_type, source_key)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_specs_embedding_hnsw
    ON specs USING hnsw (embedding vector_cosine_ops)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_specs_content_tsv
    ON specs USING gin (content_tsv)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_spec_repo
    ON tasks (spec_id, repo)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_spec_intent
    ON tasks (spec_id, intent)
  `);

  console.log("Migrations completed successfully");
}
