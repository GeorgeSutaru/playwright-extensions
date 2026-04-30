import {
  pgTable,
  uuid,
  bigint,
  text,
  integer,
  timestamp,
  boolean,
  serial,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';

export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  title: text('title'),
  startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { mode: 'date', withTimezone: true }),
  project: text('project'),
  configHash: text('config_hash'),
  environmentTags: jsonb('environment_tags'),
  source: text('source').default('live'),
  totalTests: integer('total_tests').default(0),
  passed: integer('passed').default(0),
  failed: integer('failed').default(0),
  flaky: integer('flaky').default(0),
  skipped: integer('skipped').default(0),
});

export const tests = pgTable('tests', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  file: text('file').notNull(),
  line: integer('line'),
  status: text('status', { enum: ['passed', 'failed', 'skipped', 'flaky', 'timedout'] }).notNull(),
  durationMs: integer('duration_ms'),
  errorText: text('error_text'),
  errorStack: text('error_stack'),
  retryNum: integer('retry_num').default(0),
  metadata: jsonb('metadata'),
});

export const artifacts = pgTable('artifacts', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['video', 'screenshot', 'trace'] }).notNull(),
  storagePath: text('storage_path').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow(),
});

export const traceEntries = pgTable('trace_entries', {
  id: serial('id').primaryKey(),
  artifactId: uuid('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  actionType: text('action_type'),
  selector: text('selector'),
  sourceLocation: text('source_location'),
  actionIndex: integer('action_index'),
  wallTime: doublePrecision('wall_time'),
  durationMs: integer('duration_ms'),
  url: text('url'),
  errorText: text('error_text'),
  snapshotBeforeHash: text('snapshot_before_hash'),
  snapshotAfterHash: text('snapshot_after_hash'),
  snapshotExtracted: boolean('snapshot_extracted').default(false),
  metadata: jsonb('metadata'),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Test = typeof tests.$inferSelect;
export type NewTest = typeof tests.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;
export type TraceEntry = typeof traceEntries.$inferSelect;
export type NewTraceEntry = typeof traceEntries.$inferInsert;
