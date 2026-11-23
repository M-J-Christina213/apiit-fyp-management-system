-- Add one publication record per viva. No existing events or schedules are altered.
BEGIN;
CREATE TABLE "viva_meeting_publications" (
    "viva_schedule_id" INTEGER PRIMARY KEY REFERENCES "viva_schedules"("id") ON DELETE RESTRICT,
    "transaction_id" VARCHAR(64) NOT NULL UNIQUE,
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
