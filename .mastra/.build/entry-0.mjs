import { Mastra } from '@mastra/core/mastra';
import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';
import { createContainer, asClass } from 'awilix';
import { pipeline } from '@xenova/transformers';
import { MCPServer } from '@mastra/mcp';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

"use strict";
const connectionString = process.env.DATABASE_URL || "postgresql://spechub:spechub@localhost:5434/spechub";
const sequelize = new Sequelize(connectionString, {
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
});

"use strict";
const m20260720180000CreateExtensions = {
  name: "20260720180000-create-extensions",
  async up(sequelize) {
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS vector");
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  },
  async down(sequelize) {
    await sequelize.query("DROP EXTENSION IF EXISTS pg_trgm");
    await sequelize.query("DROP EXTENSION IF EXISTS vector");
  }
};

"use strict";
const m20260720180001CreateSpecsTable = {
  name: "20260720180001-create-specs-table",
  async up(sequelize) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS specs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type VARCHAR(32) NOT NULL,
        source_key VARCHAR(128) NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
        embedding VECTOR(384),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by VARCHAR(128) NOT NULL,
        UNIQUE (source_type, source_key)
      )
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_source
      ON specs (source_type, source_key)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_embedding_hnsw
      ON specs USING hnsw (embedding vector_cosine_ops)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_content_tsv
      ON specs USING gin (content_tsv)
    `);
  },
  async down(sequelize) {
    await sequelize.query("DROP TABLE IF EXISTS specs CASCADE");
  }
};

"use strict";
const m20260720180002CreateTasksTable = {
  name: "20260720180002-create-tasks-table",
  async up(sequelize) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
        status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'in_progress', 'done')),
        repo VARCHAR(128) NOT NULL,
        intent VARCHAR(256) NOT NULL,
        title TEXT NOT NULL,
        context_snippet TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by VARCHAR(128) NOT NULL
      )
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_spec_repo
      ON tasks (spec_id, repo)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_spec_intent
      ON tasks (spec_id, intent)
    `);
  },
  async down(sequelize) {
    await sequelize.query("DROP TABLE IF EXISTS tasks CASCADE");
  }
};

"use strict";
const m20260720180003CreateChangelogTable = {
  name: "20260720180003-create-changelog-table",
  async up(sequelize) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS changelog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        spec_id UUID REFERENCES specs(id) ON DELETE SET NULL,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        field VARCHAR(64) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(128) NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  },
  async down(sequelize) {
    await sequelize.query("DROP TABLE IF EXISTS changelog CASCADE");
  }
};

"use strict";
const migrations = [
  m20260720180000CreateExtensions,
  m20260720180001CreateSpecsTable,
  m20260720180002CreateTasksTable,
  m20260720180003CreateChangelogTable
];

"use strict";
const umzug = new Umzug({
  migrations: migrations.map((m) => ({
    name: m.name,
    async up() {
      await m.up(sequelize);
    },
    async down() {
      await m.down(sequelize);
    }
  })),
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, modelName: "SequelizeMeta" }),
  logger: console
});

"use strict";
class XenovaEmbeddingService {
  extractor = null;
  async initialize() {
    this.extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model loaded: Xenova/all-MiniLM-L6-v2");
  }
  async generateEmbedding(text) {
    if (!this.extractor) {
      throw new Error(
        "Embedding pipeline not initialized. Call initialize() first."
      );
    }
    const result = await this.extractor(text, {
      pooling: "mean",
      normalize: true
    });
    return Array.from(result.data);
  }
}

"use strict";
const SpecModel = sequelize.define("Spec", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  source_type: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  source_key: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  embedding: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.STRING(128),
    allowNull: false
  }
}, {
  tableName: "specs",
  indexes: [
    { unique: true, fields: ["source_type", "source_key"] }
  ]
});

"use strict";
const TaskModel = sequelize.define("Task", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  spec_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: { isIn: [["pending", "in_progress", "done"]] }
  },
  repo: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  intent: {
    type: DataTypes.STRING(256),
    allowNull: false
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  context_snippet: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.STRING(128),
    allowNull: false
  }
}, {
  tableName: "tasks",
  indexes: [
    { fields: ["spec_id", "repo"] },
    { fields: ["spec_id", "intent"] }
  ]
});

"use strict";
const ChangelogModel = sequelize.define("Changelog", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  spec_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  task_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  field: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changed_by: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  changed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "changelog",
  timestamps: false
});

"use strict";

"use strict";
class SequelizeSpecRepository {
  async upsert(params) {
    const existing = await SpecModel.findOne({
      where: { source_type: params.source_type, source_key: params.source_key },
      attributes: ["id", "content"],
      raw: true
    });
    const embeddingStr = `[${params.embedding.join(",")}]`;
    if (existing) {
      const row = existing;
      await SpecModel.update(
        { title: params.title, content: params.content, embedding: embeddingStr, updated_by: params.updated_by },
        { where: { id: row.id } }
      );
      return { spec_id: row.id, status: "updated", oldContent: row.content };
    }
    const created = await SpecModel.create({
      source_type: params.source_type,
      source_key: params.source_key,
      title: params.title,
      content: params.content,
      embedding: embeddingStr,
      updated_by: params.updated_by
    });
    return { spec_id: created.get("id"), status: "created", oldContent: null };
  }
  async findById(id) {
    const row = await SpecModel.findByPk(id, { raw: true });
    if (!row) return null;
    return {
      id: row.id,
      source_type: row.source_type,
      source_key: row.source_key,
      title: row.title,
      content: row.content,
      embedding: row.embedding ? this.fromPgVector(row.embedding) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }
  async findBySourceKey(sourceType, sourceKey) {
    const row = await SpecModel.findOne({
      where: { source_type: sourceType, source_key: sourceKey },
      raw: true
    });
    if (!row) return null;
    return {
      id: row.id,
      source_type: row.source_type,
      source_key: row.source_key,
      title: row.title,
      content: row.content,
      embedding: row.embedding ? this.fromPgVector(row.embedding) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    };
  }
  async searchContext(params) {
    const row = await SpecModel.findByPk(params.specId, { raw: true });
    if (!row) {
      return { spec_id: params.specId, title: "", matches: [] };
    }
    const content = row.content;
    const title = row.title;
    const embedding = row.embedding ? this.fromPgVector(row.embedding) : null;
    const similarity = embedding ? this.cosineSimilarity(params.queryEmbedding, embedding) : 0;
    const sections = this.splitIntoSections(content);
    const queryTerms = params.queryText.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    const taskSnippets = [];
    if (params.repo) {
      const tasks = await TaskModel.findAll({
        where: { spec_id: params.specId, repo: params.repo },
        attributes: ["context_snippet"],
        raw: true
      });
      for (const t of tasks) {
        taskSnippets.push(t.context_snippet.toLowerCase());
      }
    }
    const scored = sections.map((section) => {
      const sectionLower = section.content.toLowerCase();
      let textScore = 0;
      for (const term of queryTerms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regexMatches = sectionLower.match(new RegExp(escaped, "g"));
        if (regexMatches) {
          textScore += regexMatches.length;
        }
      }
      if (section.content.length > 0) {
        textScore = textScore / Math.log(section.content.length + 1);
      }
      const repoBoost = taskSnippets.some(
        (snip) => queryTerms.some((term) => snip.includes(term)) && sectionLower.includes(snip.substring(0, Math.min(40, snip.length)))
      ) ? 0.3 : 0;
      const score = 0.4 * similarity + 0.6 * textScore + repoBoost;
      return {
        section: section.heading,
        snippet: this.truncateSnippet(section.content),
        score: Math.round(score * 100) / 100
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return {
      spec_id: row.id,
      title,
      matches: scored.slice(0, params.limit)
    };
  }
  fromPgVector(vector) {
    return vector.slice(1, -1).split(",").map(Number);
  }
  cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
  }
  splitIntoSections(content) {
    const sections = [];
    const lines = content.split("\n");
    let currentHeading = "Introduction";
    let currentContent = [];
    for (const line of lines) {
      if (/^#{2,3}\s/.test(line)) {
        if (currentContent.length > 0 || currentHeading !== "Introduction") {
          sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
        }
        currentHeading = line.replace(/^#{2,3}\s+/, "").trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0 || sections.length === 0) {
      sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
    }
    return sections;
  }
  truncateSnippet(content, maxLen = 300) {
    if (content.length <= maxLen) return content;
    return content.slice(0, maxLen - 3) + "...";
  }
}

"use strict";
class SequelizeTaskRepository {
  async findBySpecAndRepo(specId, repo) {
    const rows = await TaskModel.findAll({
      where: { spec_id: specId, repo },
      raw: true
    });
    return rows.map((row) => ({
      id: row.id,
      spec_id: row.spec_id,
      status: row.status,
      repo: row.repo,
      intent: row.intent,
      title: row.title,
      context_snippet: row.context_snippet,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    }));
  }
}

"use strict";
class SequelizeChangelogRepository {
  async insert(entry) {
    await ChangelogModel.create({
      spec_id: entry.spec_id,
      task_id: entry.task_id,
      field: entry.field,
      old_value: entry.old_value,
      new_value: entry.new_value,
      changed_by: entry.changed_by
    });
  }
}

"use strict";
class SaveSpecUseCase {
  specRepository;
  changelogRepository;
  embeddingService;
  constructor(deps) {
    this.specRepository = deps.specRepository;
    this.changelogRepository = deps.changelogRepository;
    this.embeddingService = deps.embeddingService;
  }
  async execute(input) {
    const { source_type, source_key, title, content, updated_by } = input;
    const embedding = await this.embeddingService.generateEmbedding(content);
    const result = await this.specRepository.upsert({
      source_type,
      source_key,
      title,
      content,
      embedding,
      updated_by
    });
    await this.changelogRepository.insert({
      spec_id: result.spec_id,
      task_id: null,
      field: "content",
      old_value: result.oldContent,
      new_value: content,
      changed_by: updated_by
    });
    return { spec_id: result.spec_id, title, status: result.status };
  }
}

"use strict";
class GetFeatureOverviewUseCase {
  specRepository;
  constructor(deps) {
    this.specRepository = deps.specRepository;
  }
  async execute(input) {
    const specId = await this.resolveSpecId(input);
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }
    const sections = this.extractHeadings(spec.content);
    return {
      spec_id: spec.id,
      title: spec.title,
      source: {
        type: spec.source_type,
        key: spec.source_key
      },
      sections,
      updated_at: spec.updated_at.toISOString()
    };
  }
  async resolveSpecId(input) {
    if (input.spec_id) return input.spec_id;
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  extractHeadings(markdown) {
    const headingRegex = /^(##|###) (.+)$/gm;
    const sections = [];
    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
      sections.push({
        heading: match[2].trim(),
        level: match[1] === "##" ? 2 : 3
      });
    }
    return sections;
  }
}

"use strict";
class SearchSpecContextUseCase {
  specRepository;
  embeddingService;
  constructor(deps) {
    this.specRepository = deps.specRepository;
    this.embeddingService = deps.embeddingService;
  }
  async execute(input) {
    const specId = await this.resolveSpecId(input);
    const queryEmbedding = await this.embeddingService.generateEmbedding(input.query);
    const result = await this.specRepository.searchContext({
      specId,
      queryEmbedding,
      queryText: input.query,
      repo: input.repo,
      limit: 3
    });
    if (!result.title) {
      throw new Error(`Spec not found: ${specId}`);
    }
    return result;
  }
  async resolveSpecId(input) {
    if (input.spec_id) return input.spec_id;
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
}

"use strict";
function buildContainer() {
  const container = createContainer();
  container.register({
    embeddingService: asClass(XenovaEmbeddingService).singleton(),
    specRepository: asClass(SequelizeSpecRepository).singleton(),
    taskRepository: asClass(SequelizeTaskRepository).singleton(),
    changelogRepository: asClass(SequelizeChangelogRepository).singleton(),
    saveSpecUseCase: asClass(SaveSpecUseCase).singleton(),
    getFeatureOverviewUseCase: asClass(GetFeatureOverviewUseCase).singleton(),
    searchSpecContextUseCase: asClass(SearchSpecContextUseCase).singleton()
  });
  return container;
}

"use strict";
function createSaveSpecTool(container) {
  return createTool({
    id: "save_spec",
    description: "Save a technical spec with vector embedding. Creates or updates (UPSERT) a spec by source_type + source_key. If the spec already exists, content is updated and the embedding is regenerated. The operation is atomic \u2014 if embedding fails, the spec is not saved.",
    inputSchema: z.object({
      source_type: z.string().max(32).describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().max(128).describe("External tracking key/ID (e.g. 'PROJ-123')"),
      title: z.string().describe("Spec title"),
      content: z.string().describe("Markdown content of the spec"),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')")
    }),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      status: z.enum(["created", "updated"])
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("saveSpecUseCase");
      return useCase.execute(inputData);
    }
  });
}

"use strict";
function createGetFeatureOverviewTool(container) {
  return createTool({
    id: "get_feature_overview",
    description: "Returns spec metadata and an index of headings (## and ###) extracted from the Markdown content. Identify the spec by its UUID or by source_type + source_key (e.g. JIRA + SHELL-1010).",
    inputSchema: z.object({
      spec_id: z.string().optional().describe("UUID of the spec to retrieve the overview for"),
      source_type: z.string().optional().describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1010')")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      source: z.object({
        type: z.string(),
        key: z.string()
      }),
      sections: z.array(z.object({
        heading: z.string(),
        level: z.number()
      })),
      updated_at: z.string()
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("getFeatureOverviewUseCase");
      return useCase.execute(inputData);
    }
  });
}

"use strict";
function createSearchSpecContextTool(container) {
  return createTool({
    id: "search_spec_context",
    description: "Search for relevant context within a spec using natural language. Combines vector similarity and full-text search to return the top-3 most relevant sections as Markdown snippets. Identify the spec by its UUID or by source_type + source_key (e.g. JIRA + SHELL-1010).",
    inputSchema: z.object({
      spec_id: z.string().optional().describe("UUID of the spec to search within"),
      source_type: z.string().optional().describe("External tracking tool type (e.g. 'JIRA', 'LINEAR', 'GITHUB')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1010')"),
      query: z.string().describe('Natural language query (e.g. "Qual o schema do evento Kafka?")'),
      repo: z.string().optional().describe("Repository name to filter/boost tasks context snippets")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      title: z.string(),
      matches: z.array(z.object({
        section: z.string(),
        snippet: z.string(),
        score: z.number()
      }))
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("searchSpecContextUseCase");
      return useCase.execute(inputData);
    }
  });
}

"use strict";
function createSpecHubMcpServer(container) {
  return new MCPServer({
    id: "spechub",
    name: "SpecHub MCP Server",
    version: "0.1.0",
    description: "Centralized technical spec storage with vector search. Save, search, and manage specs without Confluence.",
    tools: {
      save_spec: createSaveSpecTool(container),
      get_feature_overview: createGetFeatureOverviewTool(container),
      search_spec_context: createSearchSpecContextTool(container)
    }
  });
}

"use strict";
const port = parseInt(process.env.PORT || "3456", 10);
await umzug.up();
const container = buildContainer();
const embeddingService = container.resolve("embeddingService");
await embeddingService.initialize();
const specHubMcpServer = createSpecHubMcpServer(container);
const mastra = new Mastra({
  mcpServers: {
    specHub: specHubMcpServer
  },
  server: {
    port
  }
});

export { mastra };
