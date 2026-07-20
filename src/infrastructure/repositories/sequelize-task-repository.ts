import type { ITaskRepository, Task, CreateTaskParams } from '../../domain/index.js'
import { TaskModel } from '../database/models/index.js'

type TaskRow = {
  id: string
  spec_id: string
  status: 'pending' | 'in_progress' | 'done'
  repo: string
  intent: string
  title: string
  context_snippet: string
  created_at: Date
  updated_at: Date
  updated_by: string
}

export class SequelizeTaskRepository implements ITaskRepository {
  async findBySpecAndRepo(specId: string, repo: string): Promise<Task[]> {
    const rows = await TaskModel.findAll({
      where: { spec_id: specId, repo },
      raw: true,
    }) as unknown as TaskRow[]

    return rows.map(row => this.toDomain(row))
  }

  async findById(id: string): Promise<Task | null> {
    const row = await TaskModel.findByPk(id, { raw: true }) as unknown as TaskRow | null
    if (!row) return null
    return this.toDomain(row)
  }

  async findBySpecId(specId: string): Promise<Task[]> {
    const rows = await TaskModel.findAll({
      where: { spec_id: specId },
      raw: true,
    }) as unknown as TaskRow[]

    return rows.map(row => this.toDomain(row))
  }

  async create(params: CreateTaskParams): Promise<Task> {
    const created = await TaskModel.create({
      spec_id: params.spec_id,
      status: params.status,
      repo: params.repo,
      intent: params.intent,
      title: params.title,
      context_snippet: params.context_snippet,
      updated_by: params.updated_by,
    })

    const row = created.get({ plain: true }) as TaskRow
    return this.toDomain(row)
  }

  async updateStatus(taskId: string, status: 'pending' | 'in_progress' | 'done', updatedBy: string): Promise<Task | null> {
    const task = await TaskModel.findByPk(taskId)
    if (!task) return null

    await task.update({ status, updated_by: updatedBy })

    const row = task.get({ plain: true }) as TaskRow
    return this.toDomain(row)
  }

  private toDomain(row: TaskRow): Task {
    return {
      id: row.id,
      spec_id: row.spec_id,
      status: row.status,
      repo: row.repo,
      intent: row.intent,
      title: row.title,
      context_snippet: row.context_snippet,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    }
  }
}
