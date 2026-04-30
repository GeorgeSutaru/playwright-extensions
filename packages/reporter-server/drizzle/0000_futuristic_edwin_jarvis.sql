CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"type" text NOT NULL,
	"storage_path" text NOT NULL,
	"size_bytes" bigint,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"project" text,
	"config_hash" text,
	"environment_tags" jsonb,
	"source" text DEFAULT 'live',
	"total_tests" integer DEFAULT 0,
	"passed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"flaky" integer DEFAULT 0,
	"skipped" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file" text NOT NULL,
	"line" integer,
	"status" text NOT NULL,
	"duration_ms" integer,
	"error_text" text,
	"error_stack" text,
	"retry_num" integer DEFAULT 0,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "trace_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"artifact_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"action_type" text,
	"selector" text,
	"source_location" text,
	"action_index" integer,
	"wall_time" double precision,
	"duration_ms" integer,
	"url" text,
	"error_text" text,
	"snapshot_before_hash" text,
	"snapshot_after_hash" text,
	"snapshot_extracted" boolean DEFAULT false,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_entries" ADD CONSTRAINT "trace_entries_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_entries" ADD CONSTRAINT "trace_entries_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_entries" ADD CONSTRAINT "trace_entries_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;