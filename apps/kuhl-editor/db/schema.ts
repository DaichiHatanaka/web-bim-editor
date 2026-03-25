import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

// ========================================
// better-auth ユーザーテーブル参照
// ========================================

/** better-auth が管理する user テーブル（参照用） */
const authUsers = pgTable('user', {
  id: text('id').primaryKey(),
})

// ========================================
// プロジェクト管理
// ========================================

export const kuhlProjects = pgTable(
  'kuhl_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    ownerId: text('owner_id')
      .notNull()
      .references(() => authUsers.id),
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_kuhl_projects_owner').on(table.ownerId)]
)

// ========================================
// シーンデータ（ノード辞書のスナップショット）
// ========================================

export const kuhlScenes = pgTable(
  'kuhl_scenes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => kuhlProjects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    nodes: jsonb('nodes').notNull().default({}),
    rootNodeIds: jsonb('root_node_ids').notNull().default([]),
    collections: jsonb('collections').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_kuhl_scenes_project').on(table.projectId)]
)

// ========================================
// IFCファイル管理
// ========================================

export const kuhlIfcFiles = pgTable(
  'kuhl_ifc_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => kuhlProjects.id, { onDelete: 'cascade' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    storagePath: text('storage_path').notNull(),
    ifcVersion: varchar('ifc_version', { length: 20 }),
    buildingInfo: jsonb('building_info'),
    levelCount: integer('level_count'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_kuhl_ifc_files_project').on(table.projectId)]
)

// ========================================
// 積算出力履歴
// ========================================

export const kuhlTakeoffExports = pgTable(
  'kuhl_takeoff_exports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => kuhlProjects.id, { onDelete: 'cascade' }),
    sceneVersion: integer('scene_version').notNull(),
    format: varchar('format', { length: 20 }).notNull(),
    filePath: text('file_path'),
    itemCount: integer('item_count').notNull(),
    summary: jsonb('summary'),
    exportedAt: timestamp('exported_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    exportedBy: text('exported_by')
      .notNull()
      .references(() => authUsers.id),
  },
  (table) => [index('idx_kuhl_takeoff_exports_project').on(table.projectId)]
)

// ========================================
// IFC出力ジョブ（Phase 6用、スキーマのみ先行定義）
// ========================================

export const kuhlIfcExportJobs = pgTable(
  'kuhl_ifc_export_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => kuhlProjects.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    sceneSnapshot: jsonb('scene_snapshot').notNull(),
    outputFormat: varchar('output_format', { length: 20 })
      .notNull()
      .default('ifc4'),
    outputPath: text('output_path'),
    errorMessage: text('error_message'),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    requestedBy: text('requested_by')
      .notNull()
      .references(() => authUsers.id),
  },
  (table) => [
    index('idx_kuhl_ifc_export_jobs_project').on(table.projectId),
    index('idx_kuhl_ifc_export_jobs_status').on(table.status),
  ]
)
