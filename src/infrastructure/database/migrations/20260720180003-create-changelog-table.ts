import type { Sequelize } from 'sequelize'

export const m20260720180003CreateChangelogTable = {
  name: '20260720180003-create-changelog-table',
  async up(sequelize: Sequelize) {
    await sequelize.query(`
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
    `)
  },
  async down(sequelize: Sequelize) {
    await sequelize.query('DROP TABLE IF EXISTS changelog CASCADE')
  },
}
