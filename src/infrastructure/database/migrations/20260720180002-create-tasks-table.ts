import type { Sequelize } from 'sequelize'

export const m20260720180002CreateTasksTable = {
  name: '20260720180002-create-tasks-table',
  async up(sequelize: Sequelize) {
    await sequelize.query(`
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
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_spec_repo
      ON tasks (spec_id, repo)
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_spec_intent
      ON tasks (spec_id, intent)
    `)
  },
  async down(sequelize: Sequelize) {
    await sequelize.query('DROP TABLE IF EXISTS tasks CASCADE')
  },
}
