import type { Sequelize } from 'sequelize'

export const m20260720180000CreateExtensions = {
  name: '20260720180000-create-extensions',
  async up(sequelize: Sequelize) {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector')
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  },
  async down(sequelize: Sequelize) {
    await sequelize.query('DROP EXTENSION IF EXISTS pg_trgm')
    await sequelize.query('DROP EXTENSION IF EXISTS vector')
  },
}
