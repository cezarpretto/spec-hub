import { DataTypes } from 'sequelize'
import { sequelize } from '../connection.js'

export const ChangelogModel = sequelize.define('Changelog', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  spec_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  field: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  changed_by: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  changed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'changelog',
  timestamps: false,
})
