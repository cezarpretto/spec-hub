import { Sequelize } from 'sequelize'

const connectionString = process.env.DATABASE_URL || 'postgresql://spechub:spechub@localhost:5434/spechub'

export const sequelize = new Sequelize(connectionString, {
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
