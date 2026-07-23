import type { Resource, MCPServerResourceContent } from '@mastra/mcp'
import { SAVE_ARTIFACTS_WORKFLOW, type WorkflowResource } from './save-artifacts.js'

const workflows: WorkflowResource[] = [
  SAVE_ARTIFACTS_WORKFLOW,
]

export async function listWorkflowResources(): Promise<Resource[]> {
  return workflows.map(w => ({
    uri: w.uri,
    name: w.name,
    description: w.description,
    mimeType: w.mimeType,
  }))
}

export async function getWorkflowContent(uri: string): Promise<MCPServerResourceContent | null> {
  const workflow = workflows.find(w => w.uri === uri)
  if (!workflow) return null
  return { text: workflow.content }
}
