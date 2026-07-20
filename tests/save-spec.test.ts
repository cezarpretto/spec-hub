import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { initEmbedding, embeddingService } from "../src/lib/embedding/index.js";
import type { SaveSpecInput, SaveSpecOutput } from "../src/lib/types.js";

vi.mock("../src/lib/db/queries.js", () => ({
  dbOps: {
    upsertSpec: vi.fn(),
    getSpecById: vi.fn(),
    insertChangelog: vi.fn(),
  },
}));

const { dbOps } = await import("../src/lib/db/queries.js");
const { saveSpecTool } = await import("../src/mastra/tools/save-spec.js");

function buildSpec(overrides: Partial<SaveSpecInput> = {}): SaveSpecInput {
  return {
    source_type: "JIRA",
    source_key: "PROJ-42",
    title: "Feature: Payment Gateway Integration",
    content: [
      "## Overview",
      "This feature adds a payment gateway integration.",
      "",
      "### Kafka Contract",
      "The payment event uses the following schema:",
      "```json",
      '{"event": "payment.processed", "amount": 100}',
      "```",
      "",
      "### Error Handling",
      "Retry with exponential backoff.",
    ].join("\n"),
    updated_by: "claude-code",
    ...overrides,
  };
}

const mockSpecId = "550e8400-e29b-41d4-a716-446655440000";

describe("save_spec", () => {
  beforeAll(async () => {
    await initEmbedding();
  }, 60000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new spec with real embedding and changelog", async () => {
    const input = buildSpec();

    vi.mocked(dbOps.upsertSpec).mockResolvedValue({
      spec_id: mockSpecId,
      status: "created",
    });

    const result = (await saveSpecTool.execute!(input)) as SaveSpecOutput;

    expect(result).toEqual({
      spec_id: mockSpecId,
      title: input.title,
      status: "created",
    });

    expect(dbOps.upsertSpec).toHaveBeenCalledTimes(1);

    const upsertCall = vi.mocked(dbOps.upsertSpec).mock.calls[0][0];
    expect(upsertCall.source_type).toBe(input.source_type);
    expect(upsertCall.source_key).toBe(input.source_key);
    expect(upsertCall.title).toBe(input.title);
    expect(upsertCall.content).toBe(input.content);
    expect(upsertCall.updated_by).toBe(input.updated_by);
    expect(upsertCall.embedding).toBeInstanceOf(Array);
    expect(upsertCall.embedding.length).toBe(384);
  });

  it("updates an existing spec (UPSERT) with real re-embedding", async () => {
    const input = buildSpec({ title: "Updated Title" });

    vi.mocked(dbOps.upsertSpec).mockResolvedValue({
      spec_id: mockSpecId,
      status: "updated",
    });

    const result = (await saveSpecTool.execute!(input)) as SaveSpecOutput;

    expect(result).toEqual({
      spec_id: mockSpecId,
      title: "Updated Title",
      status: "updated",
    });

    const upsertCall = vi.mocked(dbOps.upsertSpec).mock.calls[0][0];
    expect(upsertCall.embedding).toBeInstanceOf(Array);
    expect(upsertCall.embedding.length).toBe(384);
  });

  it("fails when embedding generation throws and does not persist spec", async () => {
    const input = buildSpec();

    const spy = vi
      .spyOn(embeddingService, "generateEmbedding")
      .mockRejectedValueOnce(new Error("Model crashed"));

    await expect(saveSpecTool.execute!(input)).rejects.toThrow("Model crashed");

    expect(dbOps.upsertSpec).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
