import type { Sequelize } from 'sequelize'

export const m20260720180001CreateSpecsTable = {
  name: '20260720180001-create-specs-table',
  async up(sequelize: Sequelize) {
    await sequelize.query(`
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
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_source
      ON specs (source_type, source_key)
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_embedding_hnsw
      ON specs USING hnsw (embedding vector_cosine_ops)
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_content_tsv
      ON specs USING gin (content_tsv)
    `)
  },
  async down(sequelize: Sequelize) {
    await sequelize.query('DROP TABLE IF EXISTS specs CASCADE')
  },
}
