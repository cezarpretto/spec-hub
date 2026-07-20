import { DataTypes } from 'sequelize'
import { sequelize } from '../connection.js'

export const SpecModel = sequelize.define('Spec', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  source_type: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  source_key: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  embedding: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
}, {
  tableName: 'specs',
  indexes: [
    { unique: true, fields: ['source_type', 'source_key'] },
  ],
})
