import { Sequelize } from 'sequelize'

const host = process.env.DATABASE_HOST
const port = process.env.DATABASE_PORT
const user = process.env.DATABASE_USER
const password = process.env.DATABASE_PASSWORD
const database = process.env.DATABASE_NAME

const connectionString = (host && port && user && password && database)
  ? `postgresql://${user}:${password}@${host}:${port}/${database}`
  : (process.env.DATABASE_URL || 'postgresql://spechub:spechub@localhost:5434/spechub')

export const sequelize = new Sequelize(connectionString, {
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
