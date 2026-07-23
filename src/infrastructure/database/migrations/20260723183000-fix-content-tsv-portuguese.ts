import type { Sequelize } from 'sequelize'

export const m20260723183000FixContentTsvPortugues = {
  name: '20260723183000-fix-content-tsv-portuguese',
  async up(sequelize: Sequelize) {
    await sequelize.query('ALTER TABLE specs DROP COLUMN IF EXISTS content_tsv')
    await sequelize.query(`
      ALTER TABLE specs ADD COLUMN content_tsv TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_content_tsv
      ON specs USING gin (content_tsv)
    `)
  },
  async down(sequelize: Sequelize) {
    await sequelize.query('ALTER TABLE specs DROP COLUMN IF EXISTS content_tsv')
    await sequelize.query(`
      ALTER TABLE specs ADD COLUMN content_tsv TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_content_tsv
      ON specs USING gin (content_tsv)
    `)
  },
}
