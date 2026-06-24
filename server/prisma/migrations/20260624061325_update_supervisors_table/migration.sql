-- CreateTable
CREATE TABLE "assessors" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(20),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "expertise" TEXT,
    "research_interests" TEXT,

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
    "proposal_pdf" VARCHAR(255),
    "status" VARCHAR(30) DEFAULT 'Pending',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposal_requests" ADD CONSTRAINT "proposal_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposal_requests" ADD CONSTRAINT "proposal_requests_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "assessors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fyp_records" ADD CONSTRAINT "student_fyp_records_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
