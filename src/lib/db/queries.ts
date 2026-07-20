import { query } from "./connection.js";
import type { DbOperations } from "../types.js";

export const dbOps: DbOperations = {
  async upsertSpec(params) {
    const existing = await query(
      `SELECT id FROM specs WHERE source_type = $1 AND source_key = $2`,
      [params.source_type, params.source_key],
    );

    if (existing.rows.length > 0) {
      const specId = existing.rows[0].id as string;
      const oldContent = await query(`SELECT content FROM specs WHERE id = $1`, [specId]);
      const oldContentVal = oldContent.rows[0].content as string;

      await query(
        `UPDATE specs SET title = $1, content = $2, embedding = $3, updated_at = now(), updated_by = $4 WHERE id = $5`,
        [params.title, params.content, toPgVector(params.embedding), params.updated_by, specId],
      );

      await dbOps.insertChangelog({
        spec_id: specId,
        task_id: null,
        field: "content",
        old_value: oldContentVal,
        new_value: params.content,
        changed_by: params.updated_by,
      });

      return { spec_id: specId, status: "updated" as const };
    }

    const result = await query(
      `INSERT INTO specs (source_type, source_key, title, content, embedding, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [params.source_type, params.source_key, params.title, params.content, toPgVector(params.embedding), params.updated_by],
    );

    const specId = result.rows[0].id as string;

    await dbOps.insertChangelog({
      spec_id: specId,
      task_id: null,
      field: "content",
      old_value: null,
      new_value: params.content,
      changed_by: params.updated_by,
    });

    return { spec_id: specId, status: "created" as const };
  },

  async getSpecById(specId) {
    const result = await query(
      `SELECT id, source_type, source_key, title, content, updated_at FROM specs WHERE id = $1`,
      [specId],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id as string,
      source_type: row.source_type as string,
      source_key: row.source_key as string,
      title: row.title as string,
      content: row.content as string,
      updated_at: (row.updated_at as Date).toISOString(),
    };
  },

  async insertChangelog(entry) {
    await query(
      `INSERT INTO changelog (spec_id, task_id, field, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.spec_id, entry.task_id, entry.field, entry.old_value, entry.new_value, entry.changed_by],
    );
  },
};

function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
