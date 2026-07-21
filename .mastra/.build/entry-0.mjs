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
  async listBySourceKey(sourceKey) {
    const rows = await SpecModel.findAll({
      where: { source_key: sourceKey },
      attributes: ["id", "source_type", "source_key", "title", "updated_at"],
      raw: true
    });
    return rows.map((r) => ({
      spec_id: r.id,
      source_type: r.source_type,
      source_key: r.source_key,
      title: r.title,
      updated_at: r.updated_at
    }));
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
  async updateContent(specId, content, embedding, updatedBy) {
    const existing = await SpecModel.findByPk(specId);
    if (!existing) return null;
    const embeddingStr = `[${embedding.join(",")}]`;
    await existing.update({
      content,
      embedding: embeddingStr,
      updated_by: updatedBy
    });
    const row = existing.get({ plain: true });
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
    return rows.map((row) => this.toDomain(row));
  }
  async findById(id) {
    const row = await TaskModel.findByPk(id, { raw: true });
    if (!row) return null;
    return this.toDomain(row);
  }
  async findBySpecId(specId) {
    const rows = await TaskModel.findAll({
      where: { spec_id: specId },
      raw: true
    });
    return rows.map((row) => this.toDomain(row));
  }
  async create(params) {
    const created = await TaskModel.create({
      spec_id: params.spec_id,
      status: params.status,
      repo: params.repo,
      intent: params.intent,
      title: params.title,
      context_snippet: params.context_snippet,
      updated_by: params.updated_by
    });
    const row = created.get({ plain: true });
    return this.toDomain(row);
  }
  async updateStatus(taskId, status, updatedBy) {
    const task = await TaskModel.findByPk(taskId);
    if (!task) return null;
    await task.update({ status, updated_by: updatedBy });
    const row = task.get({ plain: true });
    return this.toDomain(row);
  }
  toDomain(row) {
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
      updated_by: row.updated_by
    };
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
      throw new Error(`Spec not found: ${input.spec_id || `${input.source_type}/${input.source_key}`}`);
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
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id);
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  async resolveIdentifier(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      return identifier;
    }
    const colonIdx = identifier.indexOf(":");
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx);
      const source_key = identifier.slice(colonIdx + 1);
      const spec = await this.specRepository.findBySourceKey(source_type, source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`);
      }
      return spec.id;
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`);
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
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id);
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  async resolveIdentifier(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      return identifier;
    }
    const colonIdx = identifier.indexOf(":");
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx);
      const source_key = identifier.slice(colonIdx + 1);
      const spec = await this.specRepository.findBySourceKey(source_type, source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`);
      }
      return spec.id;
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`);
  }
}

"use strict";
class GetRepoTasksUseCase {
  specRepository;
  taskRepository;
  constructor(deps) {
    this.specRepository = deps.specRepository;
    this.taskRepository = deps.taskRepository;
  }
  async execute(input) {
    const specId = await this.resolveSpecId(input);
    const allTasks = input.repo ? await this.taskRepository.findBySpecAndRepo(specId, input.repo) : await this.taskRepository.findBySpecId(specId);
    const activeTasks = allTasks.filter((t) => t.status !== "done");
    const grouped = /* @__PURE__ */ new Map();
    for (const task of activeTasks) {
      const list = grouped.get(task.repo) || [];
      list.push(task);
      grouped.set(task.repo, list);
    }
    const repos = Array.from(grouped.entries()).map(([repo, tasks]) => ({
      repo,
      tasks: tasks.map((t) => ({
        id: t.id,
        status: t.status,
        intent: t.intent,
        title: t.title,
        context_snippet: t.context_snippet
      }))
    }));
    return { spec_id: specId, repos };
  }
  async resolveSpecId(input) {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id);
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  async resolveIdentifier(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      return identifier;
    }
    const colonIdx = identifier.indexOf(":");
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx);
      const source_key = identifier.slice(colonIdx + 1);
      const spec = await this.specRepository.findBySourceKey(source_type, source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`);
      }
      return spec.id;
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`);
  }
}

"use strict";
class UpdateTaskStatusUseCase {
  specRepository;
  taskRepository;
  changelogRepository;
  constructor(deps) {
    this.specRepository = deps.specRepository;
    this.taskRepository = deps.taskRepository;
    this.changelogRepository = deps.changelogRepository;
  }
  async execute(input) {
    if (input.task_id) {
      return this.updateExistingTask(input);
    }
    return this.createNewTask(input);
  }
  async updateExistingTask(input) {
    const task = await this.taskRepository.findById(input.task_id);
    if (!task) {
      throw new Error(`Task not found: ${input.task_id}`);
    }
    const oldStatus = task.status;
    const updated = await this.taskRepository.updateStatus(input.task_id, input.status, input.updated_by);
    if (!updated) {
      throw new Error(`Failed to update task: ${input.task_id}`);
    }
    await this.changelogRepository.insert({
      spec_id: updated.spec_id,
      task_id: updated.id,
      field: "status",
      old_value: oldStatus,
      new_value: input.status,
      changed_by: input.updated_by
    });
    return { task_id: updated.id, status: updated.status };
  }
  async createNewTask(input) {
    if (!input.intent || !input.title || !input.context_snippet) {
      throw new Error("intent, title, and context_snippet are required when creating a new task");
    }
    if (!input.spec_id && !(input.source_type && input.source_key)) {
      throw new Error("Either spec_id or (source_type + source_key) must be provided when creating a new task");
    }
    const specId = await this.resolveSpecId(input);
    const created = await this.taskRepository.create({
      spec_id: specId,
      status: input.status,
      repo: input.repo,
      intent: input.intent,
      title: input.title,
      context_snippet: input.context_snippet,
      updated_by: input.updated_by
    });
    await this.changelogRepository.insert({
      spec_id: specId,
      task_id: created.id,
      field: "task_created",
      old_value: null,
      new_value: `intent=${input.intent} title=${input.title}`,
      changed_by: input.updated_by
    });
    return { task_id: created.id, status: created.status };
  }
  async resolveSpecId(input) {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id);
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  async resolveIdentifier(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      return identifier;
    }
    const colonIdx = identifier.indexOf(":");
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx);
      const source_key = identifier.slice(colonIdx + 1);
      const spec = await this.specRepository.findBySourceKey(source_type, source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`);
      }
      return spec.id;
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`);
  }
}

"use strict";
class UpdateSpecChunkUseCase {
  specRepository;
  changelogRepository;
  embeddingService;
  constructor(deps) {
    this.specRepository = deps.specRepository;
    this.changelogRepository = deps.changelogRepository;
    this.embeddingService = deps.embeddingService;
  }
  async execute(input) {
    const specId = await this.resolveSpecId(input);
    const spec = await this.specRepository.findById(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }
    const { section, updatedContent, found } = this.replaceSectionByHeading(
      spec.content,
      input.section_heading,
      input.new_content
    );
    if (!found) {
      return { spec_id: specId, section: input.section_heading, status: "not_found" };
    }
    const embedding = await this.embeddingService.generateEmbedding(updatedContent);
    await this.specRepository.updateContent(specId, updatedContent, embedding, input.updated_by);
    await this.changelogRepository.insert({
      spec_id: specId,
      task_id: null,
      field: `section:${input.section_heading}`,
      old_value: section,
      new_value: input.new_content,
      changed_by: input.updated_by
    });
    return { spec_id: specId, section: input.section_heading, status: "updated" };
  }
  replaceSectionByHeading(content, heading, newContent) {
    const headingPattern = `^#{2,3}\\s+${this.escapeRegex(heading)}\\s*$`;
    const headingRegex = new RegExp(headingPattern, "im");
    const match = content.match(headingRegex);
    if (!match || match.index === void 0) {
      return { section: "", updatedContent: content, found: false };
    }
    const headingLine = match[0];
    const headingEnd = match.index + headingLine.length;
    const remaining = content.slice(headingEnd);
    const nextHeadingRegex = /\n(?=#{2,3}\s)/;
    const nextHeadingMatch = remaining.match(nextHeadingRegex);
    const sectionEnd = nextHeadingMatch ? headingEnd + nextHeadingMatch.index : content.length;
    const oldSection = content.slice(match.index, sectionEnd).trim();
    const marker = `__SECTION_MARKER_${Date.now()}__`;
    const before = content.slice(0, match.index);
    const after = content.slice(sectionEnd);
    const updatedContent = before + marker + after;
    const finalContent = updatedContent.replace(
      marker,
      `${headingLine}

${newContent.trim()}`
    );
    return { section: oldSection, updatedContent: finalContent, found: true };
  }
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  async resolveSpecId(input) {
    if (input.spec_id) {
      return this.resolveIdentifier(input.spec_id);
    }
    if (input.source_type && input.source_key) {
      const spec = await this.specRepository.findBySourceKey(input.source_type, input.source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${input.source_type}/${input.source_key}`);
      }
      return spec.id;
    }
    throw new Error("Either spec_id or (source_type + source_key) must be provided");
  }
  async resolveIdentifier(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      return identifier;
    }
    const colonIdx = identifier.indexOf(":");
    if (colonIdx > 0) {
      const source_type = identifier.slice(0, colonIdx);
      const source_key = identifier.slice(colonIdx + 1);
      const spec = await this.specRepository.findBySourceKey(source_type, source_key);
      if (!spec) {
        throw new Error(`Spec not found for ${source_type}/${source_key}`);
      }
      return spec.id;
    }
    throw new Error(`Invalid spec_id format: "${identifier}". Use UUID or "SOURCE_TYPE:SOURCE_KEY" (e.g. "JIRA:SHELL-1010")`);
  }
}

"use strict";
class ListCardDocumentsUseCase {
  specRepository;
  constructor(deps) {
    this.specRepository = deps.specRepository;
  }
  async execute(input) {
    const results = await this.specRepository.listBySourceKey(input.source_key);
    return {
      source_key: input.source_key,
      documents: results.map((r) => ({
        spec_id: r.spec_id,
        source_type: r.source_type,
        title: r.title,
        updated_at: r.updated_at.toISOString()
      }))
    };
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
    searchSpecContextUseCase: asClass(SearchSpecContextUseCase).singleton(),
    getRepoTasksUseCase: asClass(GetRepoTasksUseCase).singleton(),
    updateTaskStatusUseCase: asClass(UpdateTaskStatusUseCase).singleton(),
    updateSpecChunkUseCase: asClass(UpdateSpecChunkUseCase).singleton(),
    listCardDocumentsUseCase: asClass(ListCardDocumentsUseCase).singleton()
  });
  return container;
}

"use strict";
function createSaveSpecTool(container) {
  return createTool({
    id: "save_spec",
    description: "Save a technical document with vector embedding. The unique key is the pair (source_type, source_key). Different source_type values for the same source_key create separate documents \u2014 use this to store multiple artifacts for one card. For example, to save all artifacts for card SHELL-1234: save with source_type=prd + source_key=SHELL-1234, then save again with source_type=spec + source_key=SHELL-1234, then again with source_type=design + source_key=SHELL-1234. Each will be a distinct document, searchable independently. If you save again with the same source_type+source_key pair, the existing document is updated (UPSERT) and its embedding regenerated.",
    inputSchema: z.object({
      source_type: z.string().max(32).describe("Document type. Use 'prd' for product requirements, 'spec' for technical specification, 'design' for architecture/design docs, or your own convention like 'jira', 'linear', 'github', 'adr', 'runbook'. Multiple documents with different source_type can share the same source_key."),
      source_key: z.string().max(128).describe("External tracking key/ID (e.g. 'SHELL-1234', 'PROJ-456'). The same source_key can be used across multiple source_type values to group related documents for the same card."),
      title: z.string().describe("Document title"),
      content: z.string().describe("Markdown content of the document"),
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
    description: "Returns document metadata and an index of headings (## and ###) extracted from the Markdown content. Identify by UUID or by source_type + source_key (e.g. spec + SHELL-1234). Since multiple documents can share the same source_key with different source_type, always include the specific source_type.",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')")
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
    description: "Search within a specific document using natural language. Combines vector similarity and full-text search to return the top-3 most relevant sections. Identify the document by UUID or by source_type + source_key (e.g. spec + SHELL-1234). Since multiple documents can share the same source_key with different source_type, always include the specific source_type to target the right document.",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design'). Required to disambiguate when multiple documents share the same source_key."),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
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
function createGetRepoTasksTool(container) {
  return createTool({
    id: "get_repo_tasks",
    description: "Returns active tasks (status != done) linked to a spec document. Tasks live in a separate table and are linked to the spec document \u2014 always pass the spec_id of the spec document, NOT the tasks document. To find the correct spec_id: use list_card_documents(shell) to see all documents, then use the spec_id from the document with source_type=spec. If no repo is specified, tasks from all repos are returned grouped by repo.",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the spec document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234"). Tasks are linked to the spec, so pass the SPEC document id, not the tasks document id.'),
      source_type: z.string().optional().describe("Document type to resolve \u2014 use 'spec' to get tasks linked to the technical spec"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      repo: z.string().optional().describe('Repository name to filter tasks (e.g. "api"). Omit to list all repos with active tasks.')
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      repos: z.array(z.object({
        repo: z.string(),
        tasks: z.array(z.object({
          id: z.string(),
          status: z.string(),
          intent: z.string(),
          title: z.string(),
          context_snippet: z.string()
        }))
      }))
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("getRepoTasksUseCase");
      return useCase.execute(inputData);
    }
  });
}

"use strict";
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

"use strict";
function createUpdateSpecChunkTool(container) {
  return createTool({
    id: "update_spec_chunk",
    description: "Edit a specific section of a document by its heading. Finds the section by Markdown heading (## or ###), replaces its content, regenerates the embedding, and records a changelog entry. Last-write-wins. Identify the document by UUID or by source_type + source_key (e.g. spec + SHELL-1234).",
    inputSchema: z.object({
      spec_id: z.string().optional().describe('UUID of the document, or "SOURCE_TYPE:SOURCE_KEY" (e.g. "spec:SHELL-1234")'),
      source_type: z.string().optional().describe("Document type (e.g. 'prd', 'spec', 'design')"),
      source_key: z.string().optional().describe("External tracking key/ID (e.g. 'SHELL-1234')"),
      section_heading: z.string().describe('The heading text of the section to replace (without ## markers, e.g. "Kafka Contract")'),
      new_content: z.string().describe("New Markdown content to replace the section with (excluding the heading line)"),
      updated_by: z.string().describe("Identifier of who/what is making the change (e.g. 'claude-code', 'cezar@corp')")
    }).refine(
      (data) => data.spec_id || data.source_type && data.source_key,
      { message: "Either spec_id or (source_type + source_key) must be provided" }
    ),
    outputSchema: z.object({
      spec_id: z.string(),
      section: z.string(),
      status: z.enum(["updated", "not_found"])
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("updateSpecChunkUseCase");
      return useCase.execute(inputData);
    }
  });
}

"use strict";
function createListCardDocumentsTool(container) {
  return createTool({
    id: "list_card_documents",
    description: 'List all documents stored for a given card/key. Given a source_key (e.g. "SHELL-1234"), returns every document regardless of source_type \u2014 PRD, spec, design, ADR, etc. Use this to discover what artifacts exist before searching or editing a specific one.',
    inputSchema: z.object({
      source_key: z.string().describe("The card/key to look up (e.g. 'SHELL-1234')")
    }),
    outputSchema: z.object({
      source_key: z.string(),
      documents: z.array(z.object({
        spec_id: z.string(),
        source_type: z.string(),
        title: z.string(),
        updated_at: z.string()
      }))
    }),
    execute: async (inputData) => {
      const useCase = container.resolve("listCardDocumentsUseCase");
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
      search_spec_context: createSearchSpecContextTool(container),
      get_repo_tasks: createGetRepoTasksTool(container),
      update_task_status: createUpdateTaskStatusTool(container),
      update_spec_chunk: createUpdateSpecChunkTool(container),
      list_card_documents: createListCardDocumentsTool(container)
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
