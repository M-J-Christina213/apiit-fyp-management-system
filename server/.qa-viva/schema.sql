-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "assessors" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(20),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "expertise" TEXT,
    "research_interests" TEXT,
    "assigned_count" INTEGER NOT NULL DEFAULT 0,
    "preferred_slots" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "assessors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" SERIAL NOT NULL,
    "batch_code" VARCHAR(20) NOT NULL,
    "batch_intake" VARCHAR(50) NOT NULL,
    "start_fyp_date" DATE NOT NULL,
    "stage" VARCHAR(20) DEFAULT 'Proposal',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" VARCHAR(255),
    "message" TEXT,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_requests" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "supervisor_id" INTEGER,
    "proposed_topic" TEXT,
    "proposal_pdf" TEXT,
    "status" TEXT DEFAULT 'Pending',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "student_confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "proposal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fyp_records" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "tentative_topic" TEXT,
    "supervisor_id" INTEGER,
    "supervisor_confirmation_status" VARCHAR(30) DEFAULT 'Pending',
    "assessor_id" INTEGER,

    CONSTRAINT "student_fyp_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER,
    "student_name" VARCHAR(100) NOT NULL,
    "cb_no" VARCHAR(20) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisors" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(20),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "expertise" TEXT,
    "research_interests" TEXT,
    "additional_information" TEXT,
    "preferred_supervision_slots" INTEGER NOT NULL DEFAULT 3,
    "signature_url" TEXT,

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT NOT NULL,
    "file_size" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Proposal',

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logsheets" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "supervisor_id" INTEGER,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending Review',
    "semester" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "signature_applied" BOOLEAN NOT NULL DEFAULT false,
    "signed_file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logsheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_supervisor_requests" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(20),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "university" VARCHAR(150) NOT NULL,
    "expertise" TEXT,
    "research_interests" TEXT,
    "preferred_supervision_slots" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_supervisor_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_periods" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150),
    "type" VARCHAR(50) NOT NULL,
    "intake" VARCHAR(50),
    "academic_year" VARCHAR(20),
    "semester" VARCHAR(20),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "daily_start_time" VARCHAR(10),
    "daily_end_time" VARCHAR(10),
    "slot_duration" INTEGER NOT NULL DEFAULT 30,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_period_batches" (
    "viva_period_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,

    CONSTRAINT "viva_period_batches_pkey" PRIMARY KEY ("viva_period_id","batch_id")
);

-- CreateTable
CREATE TABLE "viva_availabilities" (
    "id" SERIAL NOT NULL,
    "viva_period_id" INTEGER NOT NULL,
    "supervisor_id" INTEGER,
    "assessor_id" INTEGER,
    "student_id" INTEGER,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_schedules" (
    "id" SERIAL NOT NULL,
    "viva_period_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "supervisor_id" INTEGER,
    "assessor_id" INTEGER,
    "batch_code" VARCHAR(50),
    "date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "duration_mins" INTEGER NOT NULL DEFAULT 30,
    "mode" VARCHAR(20),
    "attendance_mode" VARCHAR(20) DEFAULT 'PHYSICAL',
    "supervisor_attendance_mode" VARCHAR(20) DEFAULT 'PHYSICAL',
    "assessor_attendance_mode" VARCHAR(20) DEFAULT 'PHYSICAL',
    "physical_rep_user_id" INTEGER,
    "physical_rep_name" VARCHAR(100),
    "physical_rep_email" VARCHAR(100),
    "venue" VARCHAR(100) DEFAULT 'TBA',
    "report_link" TEXT,
    "teams_meeting_id" VARCHAR(255),
    "teams_join_url" TEXT,
    "outlook_event_id" VARCHAR(255),
    "outlook_sync_status" VARCHAR(30) DEFAULT 'NOT_SYNCED',
    "outlook_sync_error" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_confirmations" (
    "id" SERIAL NOT NULL,
    "viva_schedule_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "role" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "attendance_mode" VARCHAR(20),
    "comment" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_change_requests" (
    "id" SERIAL NOT NULL,
    "viva_schedule_id" INTEGER NOT NULL,
    "requested_by" INTEGER,
    "role" VARCHAR(30) NOT NULL,
    "original_date" DATE,
    "original_time" VARCHAR(20),
    "proposed_date" DATE,
    "proposed_time" VARCHAR(20),
    "attendance_mode" VARCHAR(20),
    "reason" TEXT,
    "admin_response" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "viva_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_notes" (
    "id" SERIAL NOT NULL,
    "viva_schedule_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "student_id" INTEGER,
    "role" VARCHAR(30) NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_audit_logs" (
    "id" SERIAL NOT NULL,
    "viva_period_id" INTEGER,
    "viva_schedule_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "performed_by" VARCHAR(100),
    "role" VARCHAR(30),
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "microsoft_integrations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "microsoft_email" VARCHAR(150),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "calendar_id" VARCHAR(255),
    "calendar_name" VARCHAR(150),
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "microsoft_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_outlook_events" (
    "id" SERIAL NOT NULL,
    "viva_schedule_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "outlook_event_id" VARCHAR(255) NOT NULL,
    "sync_status" VARCHAR(30) NOT NULL DEFAULT 'SYNCED',
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_outlook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_meeting_publications" (
    "viva_schedule_id" INTEGER NOT NULL,
    "transaction_id" VARCHAR(64) NOT NULL,
    "organizer_email" VARCHAR(254),
    "organizer_calendar_id" TEXT,
    "auth_user_id" INTEGER,
    "token_owner_email" VARCHAR(254),
    "graph_event_id" TEXT,
    "teams_join_url" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'NOT_PUBLISHED',
    "last_error" TEXT,
    "content_hash" VARCHAR(64),
    "attendee_responses" JSONB,
    "creation_uncertain" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_requested" BOOLEAN NOT NULL DEFAULT false,
    "lease_owner" VARCHAR(64),
    "lease_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viva_meeting_publications_pkey" PRIMARY KEY ("viva_schedule_id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "milestone_code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "component" VARCHAR(50) DEFAULT 'Report',
    "max_marks" DECIMAL(5,2) DEFAULT 0,
    "rubric_key" VARCHAR(50),
    "semester" VARCHAR(30) DEFAULT 'Semester 1',
    "opening_date" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "assessment_start_date" TIMESTAMP(3),
    "assessment_end_date" TIMESTAMP(3),
    "is_date_tbc" BOOLEAN NOT NULL DEFAULT false,
    "student_instructions" TEXT,
    "lms_activity_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_by" VARCHAR(150),
    "updated_by" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_milestone_status" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
    "submitted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_milestone_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_reminders" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "reminder_type" VARCHAR(50) NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_submissions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "stage" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255),
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "file_type" VARCHAR(100),
    "source" VARCHAR(40) NOT NULL DEFAULT 'MANUAL_REVIEW_COPY',
    "lms_activity_url" TEXT,
    "lms_submission_id" VARCHAR(100),
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "attempt_number" INTEGER DEFAULT 1,
    "submission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "sync_status" VARCHAR(30) DEFAULT 'NOT_SYNCED',
    "sync_error" TEXT,
    "uploaded_by_email" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_notes" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "reviewer_email" VARCHAR(150) NOT NULL,
    "reviewer_role" VARCHAR(30) NOT NULL,
    "stage" VARCHAR(30) NOT NULL,
    "submission_id" INTEGER,
    "submission_version" INTEGER,
    "page_reference" VARCHAR(50),
    "private_notes" TEXT,
    "viva_questions" JSONB,
    "draft_feedback" TEXT,
    "released_feedback" TEXT,
    "feedback_released_at" TIMESTAMP(3),
    "feedback_released_by" VARCHAR(150),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviewer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_course_mappings" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "stage" VARCHAR(30) NOT NULL,
    "lms_course_id" VARCHAR(100),
    "lms_course_name" VARCHAR(255),
    "lms_activity_id" VARCHAR(100),
    "lms_activity_type" VARCHAR(50) DEFAULT 'turnitintooltwo',
    "lms_activity_url" TEXT,
    "assignment_part" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_course_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lms_user_mappings" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "institutional_id" VARCHAR(50) NOT NULL,
    "institutional_email" VARCHAR(150) NOT NULL,
    "lms_user_id" VARCHAR(100),
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lms_user_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_date_audit" (
    "id" SERIAL NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "changed_by" VARCHAR(150) NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_date_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_evaluations" (
    "id" SERIAL NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "viva_schedule_id" INTEGER,
    "examiner_email" VARCHAR(150) NOT NULL,
    "examiner_role" VARCHAR(30) NOT NULL,
    "examiner_name" VARCHAR(150),
    "rubric_key" VARCHAR(50) NOT NULL,
    "rubric_version" INTEGER NOT NULL DEFAULT 1,
    "rubric_snapshot" JSONB,
    "criterion_scores" JSONB NOT NULL,
    "total_score" DECIMAL(5,2),
    "shared_rationale" TEXT,
    "private_notes" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_reconciliations" (
    "id" SERIAL NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'UNDER_RECONCILIATION',
    "reconciliation_deadline" TIMESTAMP(3),
    "clock_started_at" TIMESTAMP(3),
    "final_agreed_mark" DECIMAL(5,2),
    "third_marker_email" VARCHAR(150),
    "third_marker_name" VARCHAR(150),
    "third_marker_assigned_by" VARCHAR(150),
    "third_marker_assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_proposals" (
    "id" SERIAL NOT NULL,
    "reconciliation_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposed_by_email" VARCHAR(150) NOT NULL,
    "proposed_by_role" VARCHAR(30) NOT NULL,
    "proposed_mark" DECIMAL(5,2) NOT NULL,
    "discussion_notes" TEXT,
    "supervisor_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "supervisor_conf_at" TIMESTAMP(3),
    "supervisor_conf_by" VARCHAR(150),
    "assessor_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "assessor_conf_at" TIMESTAMP(3),
    "assessor_conf_by" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_moderation_records" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "final_calculated_mark" DECIMAL(5,2) NOT NULL,
    "moderation_band" VARCHAR(30) NOT NULL,
    "moderation_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "justification_notes" TEXT,
    "senior_examiner_1" VARCHAR(150),
    "senior_examiner_2" VARCHAR(150),
    "audited_by" VARCHAR(150),
    "audited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessors_email_key" ON "assessors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_code_key" ON "batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "students_cb_no_key" ON "students"("cb_no");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_email_key" ON "supervisors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "external_supervisor_requests_email_key" ON "external_supervisor_requests"("email");

-- CreateIndex
CREATE INDEX "viva_availabilities_viva_period_id_idx" ON "viva_availabilities"("viva_period_id");

-- CreateIndex
CREATE INDEX "viva_availabilities_date_idx" ON "viva_availabilities"("date");

-- CreateIndex
CREATE INDEX "viva_schedules_viva_period_id_student_id_idx" ON "viva_schedules"("viva_period_id", "student_id");

-- CreateIndex
CREATE INDEX "viva_confirmations_viva_schedule_id_idx" ON "viva_confirmations"("viva_schedule_id");

-- CreateIndex
CREATE INDEX "viva_change_requests_viva_schedule_id_idx" ON "viva_change_requests"("viva_schedule_id");

-- CreateIndex
CREATE INDEX "viva_notes_viva_schedule_id_idx" ON "viva_notes"("viva_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "microsoft_integrations_user_id_key" ON "microsoft_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "viva_outlook_events_viva_schedule_id_user_id_key" ON "viva_outlook_events"("viva_schedule_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "viva_meeting_publications_transaction_id_key" ON "viva_meeting_publications"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_batch_id_milestone_code_key" ON "milestones"("batch_id", "milestone_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_milestone_status_student_id_milestone_id_key" ON "student_milestone_status"("student_id", "milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "sent_reminders_student_id_milestone_id_reminder_type_key" ON "sent_reminders"("student_id", "milestone_id", "reminder_type");

-- CreateIndex
CREATE INDEX "student_submissions_student_id_stage_idx" ON "student_submissions"("student_id", "stage");

-- CreateIndex
CREATE INDEX "reviewer_notes_student_id_stage_idx" ON "reviewer_notes"("student_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "reviewer_notes_student_id_reviewer_email_stage_key" ON "reviewer_notes"("student_id", "reviewer_email", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "lms_course_mappings_batch_id_stage_key" ON "lms_course_mappings"("batch_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "lms_user_mappings_student_id_key" ON "lms_user_mappings"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_user_mappings_institutional_id_key" ON "lms_user_mappings"("institutional_id");

-- CreateIndex
CREATE UNIQUE INDEX "lms_user_mappings_institutional_email_key" ON "lms_user_mappings"("institutional_email");

-- CreateIndex
CREATE INDEX "milestone_date_audit_milestone_id_idx" ON "milestone_date_audit"("milestone_id");

-- CreateIndex
CREATE INDEX "assessment_evaluations_student_id_milestone_id_idx" ON "assessment_evaluations"("student_id", "milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_evaluations_milestone_id_student_id_examiner_ema_key" ON "assessment_evaluations"("milestone_id", "student_id", "examiner_email");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_reconciliations_milestone_id_student_id_key" ON "milestone_reconciliations"("milestone_id", "student_id");

-- CreateIndex
CREATE INDEX "agreement_proposals_reconciliation_id_version_idx" ON "agreement_proposals"("reconciliation_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "student_moderation_records_student_id_batch_id_key" ON "student_moderation_records"("student_id", "batch_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposal_requests" ADD CONSTRAINT "proposal_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_requests" ADD CONSTRAINT "proposal_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "assessors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logsheets" ADD CONSTRAINT "logsheets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logsheets" ADD CONSTRAINT "logsheets_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_period_batches" ADD CONSTRAINT "viva_period_batches_viva_period_id_fkey" FOREIGN KEY ("viva_period_id") REFERENCES "viva_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_period_batches" ADD CONSTRAINT "viva_period_batches_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_availabilities" ADD CONSTRAINT "viva_availabilities_viva_period_id_fkey" FOREIGN KEY ("viva_period_id") REFERENCES "viva_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_availabilities" ADD CONSTRAINT "viva_availabilities_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_availabilities" ADD CONSTRAINT "viva_availabilities_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "assessors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_availabilities" ADD CONSTRAINT "viva_availabilities_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_schedules" ADD CONSTRAINT "viva_schedules_viva_period_id_fkey" FOREIGN KEY ("viva_period_id") REFERENCES "viva_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_schedules" ADD CONSTRAINT "viva_schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_schedules" ADD CONSTRAINT "viva_schedules_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_schedules" ADD CONSTRAINT "viva_schedules_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "assessors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_schedules" ADD CONSTRAINT "viva_schedules_physical_rep_user_id_fkey" FOREIGN KEY ("physical_rep_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_confirmations" ADD CONSTRAINT "viva_confirmations_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_change_requests" ADD CONSTRAINT "viva_change_requests_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_notes" ADD CONSTRAINT "viva_notes_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_audit_logs" ADD CONSTRAINT "viva_audit_logs_viva_period_id_fkey" FOREIGN KEY ("viva_period_id") REFERENCES "viva_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_audit_logs" ADD CONSTRAINT "viva_audit_logs_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "microsoft_integrations" ADD CONSTRAINT "microsoft_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_outlook_events" ADD CONSTRAINT "viva_outlook_events_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_outlook_events" ADD CONSTRAINT "viva_outlook_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_meeting_publications" ADD CONSTRAINT "viva_meeting_publications_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_milestone_status" ADD CONSTRAINT "student_milestone_status_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_milestone_status" ADD CONSTRAINT "student_milestone_status_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_submissions" ADD CONSTRAINT "student_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_notes" ADD CONSTRAINT "reviewer_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_notes" ADD CONSTRAINT "reviewer_notes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "student_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_course_mappings" ADD CONSTRAINT "lms_course_mappings_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lms_user_mappings" ADD CONSTRAINT "lms_user_mappings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_date_audit" ADD CONSTRAINT "milestone_date_audit_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_evaluations" ADD CONSTRAINT "assessment_evaluations_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_evaluations" ADD CONSTRAINT "assessment_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_evaluations" ADD CONSTRAINT "assessment_evaluations_viva_schedule_id_fkey" FOREIGN KEY ("viva_schedule_id") REFERENCES "viva_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_reconciliations" ADD CONSTRAINT "milestone_reconciliations_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_reconciliations" ADD CONSTRAINT "milestone_reconciliations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_proposals" ADD CONSTRAINT "agreement_proposals_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "milestone_reconciliations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_moderation_records" ADD CONSTRAINT "student_moderation_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_moderation_records" ADD CONSTRAINT "student_moderation_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
