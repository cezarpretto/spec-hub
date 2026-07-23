import { sequelize } from '../database/connection.js'
import type { IUnitOfWork } from '../../domain/index.js'

export class SequelizeUnitOfWork implements IUnitOfWork {
  async transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return sequelize.transaction(async (t) => {
      return fn(t)
    })
  }
}
