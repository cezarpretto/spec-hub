import { Umzug, SequelizeStorage } from 'umzug'
import { sequelize } from './connection.js'
import { migrations } from './migrations/index.js'

export const umzug = new Umzug({
  migrations: migrations.map(m => ({
    name: m.name,
    async up() {
      await m.up(sequelize)
    },
    async down() {
      await m.down(sequelize)
    },
  })),
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, modelName: 'SequelizeMeta' }),
  logger: console,
})
