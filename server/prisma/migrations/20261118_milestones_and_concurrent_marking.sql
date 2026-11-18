-- ====================================================================
-- MIGRATION: Milestones and Concurrent Viva Marking System
-- Additive, safe, non-destructive schema update for APIIT FYP Management System
-- ====================================================================

-- 1. ENHANCE MILESTONES TABLE
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "milestone_code" VARCHAR(50);
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "component" VARCHAR(50) DEFAULT 'Report';
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "max_marks" NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "rubric_key" VARCHAR(50);
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "semester" VARCHAR(30) DEFAULT 'Semester 1';
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "opening_date" TIMESTAMP;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "assessment_start_date" TIMESTAMP;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "assessment_end_date" TIMESTAMP;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "is_date_tbc" BOOLEAN DEFAULT false;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "student_instructions" TEXT;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "lms_activity_url" TEXT;
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PUBLISHED';
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(150);
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(150);
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Unique constraint for milestone_code per batch (when milestone_code is specified)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_milestones_batch_code" 
ON "milestones"("batch_id", "milestone_code") 
WHERE "milestone_code" IS NOT NULL;

-- 2. CREATE MILESTONE DATE AUDIT TABLE
CREATE TABLE IF NOT EXISTS "milestone_date_audit" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER NOT NULL REFERENCES "milestones"("id") ON DELETE CASCADE,
    "changed_by" VARCHAR(150) NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_milestone_date_audit_milestone" ON "milestone_date_audit"("milestone_id");

-- 3. CREATE INDEPENDENT EXAMINER EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS "assessment_evaluations" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER NOT NULL REFERENCES "milestones"("id") ON DELETE RESTRICT,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE RESTRICT,
    "viva_schedule_id" INTEGER REFERENCES "viva_schedules"("id") ON DELETE SET NULL,
    "examiner_email" VARCHAR(150) NOT NULL,
    "examiner_role" VARCHAR(30) NOT NULL,
    "examiner_name" VARCHAR(150),
    "rubric_key" VARCHAR(50) NOT NULL,
    "rubric_version" INTEGER DEFAULT 1,
    "rubric_snapshot" JSONB,
    "criterion_scores" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "total_score" NUMERIC(5, 2),
    "shared_rationale" TEXT,
    "private_notes" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_evaluations_milestone_student_examiner" UNIQUE ("milestone_id", "student_id", "examiner_email")
);

CREATE INDEX IF NOT EXISTS "idx_evaluations_student_milestone" ON "assessment_evaluations"("student_id", "milestone_id");

-- 4. CREATE MILESTONE RECONCILIATIONS TABLE
CREATE TABLE IF NOT EXISTS "milestone_reconciliations" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER NOT NULL REFERENCES "milestones"("id") ON DELETE RESTRICT,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE RESTRICT,
    "status" VARCHAR(40) NOT NULL DEFAULT 'UNDER_RECONCILIATION',
    "reconciliation_deadline" TIMESTAMP,
    "clock_started_at" TIMESTAMP,
    "final_agreed_mark" NUMERIC(5, 2),
    "third_marker_email" VARCHAR(150),
    "third_marker_name" VARCHAR(150),
    "third_marker_assigned_by" VARCHAR(150),
    "third_marker_assigned_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_reconciliations_milestone_student" UNIQUE ("milestone_id", "student_id")
);

-- 5. CREATE AGREEMENT PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS "agreement_proposals" (
    "id" SERIAL PRIMARY KEY,
    "reconciliation_id" INTEGER NOT NULL REFERENCES "milestone_reconciliations"("id") ON DELETE RESTRICT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposed_by_email" VARCHAR(150) NOT NULL,
    "proposed_by_role" VARCHAR(30) NOT NULL,
    "proposed_mark" NUMERIC(5, 2) NOT NULL,
    "discussion_notes" TEXT,
    "supervisor_confirmed" BOOLEAN DEFAULT false,
    "supervisor_conf_at" TIMESTAMP,
    "supervisor_conf_by" VARCHAR(150),
    "assessor_confirmed" BOOLEAN DEFAULT false,
    "assessor_conf_at" TIMESTAMP,
    "assessor_conf_by" VARCHAR(150),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_proposals_reconciliation_ver" ON "agreement_proposals"("reconciliation_id", "version");

-- 6. CREATE STUDENT MODERATION RECORDS TABLE
CREATE TABLE IF NOT EXISTS "student_moderation_records" (
    "id" SERIAL PRIMARY KEY,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE RESTRICT,
    "batch_id" INTEGER NOT NULL REFERENCES "batches"("id") ON DELETE RESTRICT,
    "final_calculated_mark" NUMERIC(5, 2) NOT NULL,
    "moderation_band" VARCHAR(30) NOT NULL,
    "moderation_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "justification_notes" TEXT,
    "senior_examiner_1" VARCHAR(150),
    "senior_examiner_2" VARCHAR(150),
    "audited_by" VARCHAR(150),
    "audited_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_moderation_student_batch" UNIQUE ("student_id", "batch_id")
);
