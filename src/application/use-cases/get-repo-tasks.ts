import type { ISpecRepository, ITaskRepository } from '../../domain/index.js'
import type { GetRepoTasksInput, GetRepoTasksOutput } from '../dto.js'

interface Dependencies {
  specRepository: ISpecRepository
  taskRepository: ITaskRepository
}

export class GetRepoTasksUseCase {
  private readonly specRepository: ISpecRepository
  private readonly taskRepository: ITaskRepository

  constructor(deps: Dependencies) {
    this.specRepository = deps.specRepository
    this.taskRepository = deps.taskRepository
  }

  async execute(input: GetRepoTasksInput): Promise<GetRepoTasksOutput> {
    const specId = await this.resolveSpecId(input)

    const allTasks = input.repo
      ? await this.taskRepository.findBySpecAndRepo(specId, input.repo)
      : await this.taskRepository.findBySpecId(specId)

    const activeTasks = allTasks.filter(t => t.status !== 'done')

    const grouped = new Map<string, typeof activeTasks>()
    for (const task of activeTasks) {
      const list = grouped.get(task.repo) || []
      list.push(task)
      grouped.set(task.repo, list)
    }

    const repos = Array.from(grouped.entries()).map(([repo, tasks]) => ({
      repo,
      tasks: tasks.map(t => ({
        id: t.id,
        status: t.status,
        intent: t.intent,
        title: t.title,
        context_snippet: t.context_snippet,
      })),
    }))

    return { spec_id: specId, repos }
  }

  private async resolveSpecId(input: GetRepoTasksInput): Promise<string> {
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
