export { m20260720180000CreateExtensions } from './20260720180000-create-extensions.js'
export { m20260720180001CreateSpecsTable } from './20260720180001-create-specs-table.js'
export { m20260720180002CreateTasksTable } from './20260720180002-create-tasks-table.js'
export { m20260720180003CreateChangelogTable } from './20260720180003-create-changelog-table.js'
export { m20260723183000FixContentTsvPortugues } from './20260723183000-fix-content-tsv-portuguese.js'

import { m20260720180000CreateExtensions } from './20260720180000-create-extensions.js'
import { m20260720180001CreateSpecsTable } from './20260720180001-create-specs-table.js'
import { m20260720180002CreateTasksTable } from './20260720180002-create-tasks-table.js'
import { m20260720180003CreateChangelogTable } from './20260720180003-create-changelog-table.js'
import { m20260723183000FixContentTsvPortugues } from './20260723183000-fix-content-tsv-portuguese.js'

export const migrations = [
  m20260720180000CreateExtensions,
  m20260720180001CreateSpecsTable,
  m20260720180002CreateTasksTable,
  m20260720180003CreateChangelogTable,
  m20260723183000FixContentTsvPortugues,
]
