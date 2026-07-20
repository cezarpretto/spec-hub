import type { IChangelogRepository } from '../../domain/index.js'
import { ChangelogModel } from '../database/models/index.js'

export class SequelizeChangelogRepository implements IChangelogRepository {
  async insert(entry: {
    spec_id: string | null
    task_id: string | null
    field: string
    old_value: string | null
    new_value: string | null
    changed_by: string
  }): Promise<void> {
    await ChangelogModel.create({
      spec_id: entry.spec_id,
      task_id: entry.task_id,
      field: entry.field,
      old_value: entry.old_value,
      new_value: entry.new_value,
      changed_by: entry.changed_by,
    })
  }
}
