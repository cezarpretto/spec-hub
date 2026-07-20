import { DataTypes } from 'sequelize'
import { sequelize } from '../connection.js'

export const TaskModel = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  spec_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [['pending', 'in_progress', 'done']] },
  },
  repo: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  intent: {
    type: DataTypes.STRING(256),
    allowNull: false,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  context_snippet: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  updated_by: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
}, {
  tableName: 'tasks',
  indexes: [
    { fields: ['spec_id', 'repo'] },
    { fields: ['spec_id', 'intent'] },
  ],
})
