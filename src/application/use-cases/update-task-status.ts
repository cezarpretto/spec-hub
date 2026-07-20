import type { ISpecRepository, ITaskRepository, IChangelogRepository } from '../../domain/index.js'
import type { UpdateTaskStatusInput, UpdateTaskStatusOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  taskRepository: ITaskRepository
  changelogRepository: IChangelogRepository
}

export class UpdateTaskStatusUseCase {
  private readonly specRepository: ISpecRepository
  private readonly taskRepository: ITaskRepository
  private readonly changelogRepository: IChangelogRepository

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.taskRepository = deps.taskRepository
    this.changelogRepository = deps.changelogRepository
  }

  async execute(input: UpdateTaskStatusInput): Promise<UpdateTaskStatusOutput> {
    if (input.task_id) {
      return this.updateExistingTask(input)
    }
    return this.createNewTask(input)
  }

  private async updateExistingTask(input: UpdateTaskStatusInput): Promise<UpdateTaskStatusOutput> {
    const task = await this.taskRepository.findById(input.task_id!)
    if (!task) {
      throw new Error(`Task not found: ${input.task_id}`)
    }

    const oldStatus = task.status
    const updated = await this.taskRepository.updateStatus(input.task_id!, input.status, input.updated_by)
    if (!updated) {
      throw new Error(`Failed to update task: ${input.task_id}`)
    }

    await this.changelogRepository.insert({
      spec_id: updated.spec_id,
      task_id: updated.id,
      field: 'status',
      old_value: oldStatus,
      new_value: input.status,
      changed_by: input.updated_by,
    })

    return { task_id: updated.id, status: updated.status }
  }

  private async createNewTask(input: UpdateTaskStatusInput): Promise<UpdateTaskStatusOutput> {
    if (!input.intent || !input.title || !input.context_snippet) {
      throw new Error('intent, title, and context_snippet are required when creating a new task')
    }

    if (!input.spec_id && !(input.source_type && input.source_key)) {
      throw new Error('Either spec_id or (source_type + source_key) must be provided when creating a new task')
    }

    const specId = await this.resolveSpecId(input)

    const created = await this.taskRepository.create({
      spec_id: specId,
      status: input.status,
      repo: input.repo,
      intent: input.intent,
      title: input.title,
      context_snippet: input.context_snippet,
      updated_by: input.updated_by,
    })

    await this.changelogRepository.insert({
      spec_id: specId,
      task_id: created.id,
      field: 'task_created',
      old_value: null,
      new_value: `intent=${input.intent} title=${input.title}`,
      changed_by: input.updated_by,
    })

    return { task_id: created.id, status: created.status }
  }

  private async resolveSpecId(input: UpdateTaskStatusInput): Promise<string> {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id)
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`)
      }
      return spec.id
    }
    throw new Error('Either spec_id or (source_type + source_key) must be provided')
  }

  private async resolveIdentifier(identifier: string): Promise<string> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(identifier)) {
      return identifier
    }
    const colonIdx = identifier.indexOf(':')
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx)
      const source_key = identifier.slice(colonIdx + 1)
      const spec = await this.specRepository.findBySourceKey(source_type, source_key)
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`)
      }
      return spec.id
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`)
  }
}
