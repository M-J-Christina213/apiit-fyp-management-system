-- Milestone read/create compatibility only. No template application or publishing.
BEGIN;

ALTER TABLE "milestones"
    ADD COLUMN IF NOT EXISTS "milestone_code" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "component" VARCHAR(50) DEFAULT 'Report',
    ADD COLUMN IF NOT EXISTS "max_marks" DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "rubric_key" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "semester" VARCHAR(30) DEFAULT 'Semester 1',
    ADD COLUMN IF NOT EXISTS "opening_date" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "assessment_start_date" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "assessment_end_date" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "is_date_tbc" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "student_instructions" TEXT,
    ADD COLUMN IF NOT EXISTS "lms_activity_url" TEXT,
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(150),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve existing deadlines; allow future drafts whose dates are TBC.
ALTER TABLE "milestones" ALTER COLUMN "deadline" DROP NOT NULL;

-- NULL codes remain valid for independently added and legacy milestones.
CREATE UNIQUE INDEX IF NOT EXISTS "milestones_batch_id_milestone_code_key"
    ON "milestones" ("batch_id", "milestone_code");

CREATE TABLE IF NOT EXISTS "milestone_date_audit" (
    "id" SERIAL PRIMARY KEY,
    "milestone_id" INTEGER NOT NULL REFERENCES "milestones"("id") ON DELETE CASCADE,
    "changed_by" VARCHAR(150) NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "milestone_date_audit_milestone_id_idx"
    ON "milestone_date_audit" ("milestone_id");

COMMIT;
