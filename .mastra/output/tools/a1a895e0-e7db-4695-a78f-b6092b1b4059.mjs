import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

function createUpdateTaskStatusTool(container) {
  return createTool({
    id: "update_task_status",
    description: "Mark a task as done or create a new task linked to a spec document. If task_id is provided, updates the existing task. If omitted, creates a new task (requires intent, title, context_snippet). Tasks are linked to the spec document \u2014 always use the spec_id of the document with source_type=spec. Both paths record a changelog entry.",
    inputSchema: z.object({
      task_id: z.string().optional().describe("UUID of an existing task to update. If omitted, a new task is created."),
      spec_id: z.string().optional().describe('UUID of the spec document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234"). Tasks are linked to the spec. Required when creating a new task.'),
      source_type: z.string().optional().describe("Document type to resolve \u2014 use 'spec' to link tasks to the technical spec"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      repo: z.string().describe('Repository name (e.g. "service-payments-consumer")'),
      status: z.enum(["pending", "in_progress", "done"]).describe("Task status to set"),
      intent: z.string().optional().describe("Normalized intent slug (required when creating a new task)"),
      title: z.string().optional().describe("Task title (required when creating a new task)"),
      context_snippet: z.string().optional().describe("Relevant Markdown snippet from the spec (required when creating a new task)"),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')")
    }),
    outputSchema: z.object({
      task_id: z.string(),
      status: z.string()
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("updateTaskStatusUseCase");
      return useCase.execute(inputData);
    }
  });
}

export { createUpdateTaskStatusTool };
