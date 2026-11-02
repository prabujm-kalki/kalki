-- Migration 0066: Task checklist configuration and approval schema alignment
ALTER TABLE task_definitions 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS checklist_config JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE task_instances 
ADD COLUMN IF NOT EXISTS checklist_responses JSONB,
ADD COLUMN IF NOT EXISTS score_snapshot JSONB;

