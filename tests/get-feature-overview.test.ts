import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetFeatureOverviewOutput } from "../src/lib/types.js";

vi.mock("../src/lib/db/queries.js", () => ({
  dbOps: {
    upsertSpec: vi.fn(),
    getSpecById: vi.fn(),
    insertChangelog: vi.fn(),
  },
}));

const { dbOps } = await import("../src/lib/db/queries.js");
const { getFeatureOverviewTool } = await import("../src/mastra/tools/get-feature-overview.js");

const mockSpecId = "550e8400-e29b-41d4-a716-446655440000";

const mockSpec = {
  id: mockSpecId,
  source_type: "LINEAR",
  source_key: "TEAM-99",
  title: "Service: User Authentication",
  content: [
    "## Architecture",
    "This service handles authentication for the platform.",
    "",
    "### Endpoints",
    "- POST /login",
    "- POST /register",
    "",
    "### Database Schema",
    "Users table with bcrypt hashed passwords.",
    "",
    "## Testing",
    "Integration tests with mocked OAuth provider.",
    "",
    "### Unit Tests",
    "Cover all service methods.",
    "",
    "## Deployment",
    "Docker container on port 8080.",
  ].join("\n"),
  updated_at: "2025-07-20T10:00:00.000Z",
};

describe("get_feature_overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns spec metadata and heading index", async () => {
    vi.mocked(dbOps.getSpecById).mockResolvedValue(mockSpec);

    const result = (await getFeatureOverviewTool.execute!({ spec_id: mockSpecId })) as GetFeatureOverviewOutput;

    expect(result.spec_id).toBe(mockSpecId);
    expect(result.title).toBe(mockSpec.title);
    expect(result.source).toEqual({
      type: "LINEAR",
      key: "TEAM-99",
    });
    expect(result.updated_at).toBe(mockSpec.updated_at);

    expect(result.sections).toHaveLength(6);
    expect(result.sections).toEqual([
      { heading: "Architecture", level: 2 },
      { heading: "Endpoints", level: 3 },
      { heading: "Database Schema", level: 3 },
      { heading: "Testing", level: 2 },
      { heading: "Unit Tests", level: 3 },
      { heading: "Deployment", level: 2 },
    ]);
  });

  it("returns error for non-existent spec", async () => {
    vi.mocked(dbOps.getSpecById).mockResolvedValue(null);

    await expect(
      getFeatureOverviewTool.execute!({ spec_id: "non-existent-id" }),
    ).rejects.toThrow("Spec not found: non-existent-id");

    expect(dbOps.getSpecById).toHaveBeenCalledWith("non-existent-id");
  });

  it("returns spec with no headings when content has none", async () => {
    vi.mocked(dbOps.getSpecById).mockResolvedValue({
      ...mockSpec,
      content: "Plain text without any headings.",
    });

    const result = (await getFeatureOverviewTool.execute!({ spec_id: mockSpecId })) as GetFeatureOverviewOutput;

    expect(result.sections).toEqual([]);
  });

  it("parses only ## and ### headings, ignoring # and ####", async () => {
    vi.mocked(dbOps.getSpecById).mockResolvedValue({
      ...mockSpec,
      content: [
        "# Title Level 1",
        "intro text",
        "## H2 Section",
        "stuff",
        "### H3 Subsection",
        "more stuff",
        "#### H4 Ignored",
        "details",
      ].join("\n"),
    });

    const result = (await getFeatureOverviewTool.execute!({ spec_id: mockSpecId })) as GetFeatureOverviewOutput;

    expect(result.sections).toEqual([
      { heading: "H2 Section", level: 2 },
      { heading: "H3 Subsection", level: 3 },
    ]);
  });
});
