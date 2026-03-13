-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROPONENT', 'SCRUTINY', 'MOM_TEAM');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'EDS', 'REFERRED', 'MOM_GENERATED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FORM_1', 'FORM_1A', 'ENVIRONMENTAL_IMPACT_ASSESSMENT', 'PRE_FEASIBILITY_REPORT', 'MAP_TOPOSHEET', 'FOREST_CLEARANCE', 'WATER_CONSENT', 'NOC', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PROPONENT',
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "proponent_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "district" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Chhattisgarh',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "area_ha" DOUBLE PRECISION,
    "investment_cr" DOUBLE PRECISION,
    "employment_count" INTEGER,
    "fee_amount" DOUBLE PRECISION,
    "fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "gist_text" TEXT,
    "mom_text" TEXT,
    "mom_locked" BOOLEAN NOT NULL DEFAULT false,
    "mom_locked_at" TIMESTAMP(3),
    "sla_deadline" TIMESTAMP(3),
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "ocr_text" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "scanned" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "utr_number" TEXT,
    "qr_code_url" TEXT,
    "upi_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eds_notices" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "deficiencies" JSONB NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "remarks" TEXT,

    CONSTRAINT "eds_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_chain" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "application_id" TEXT,
    "payload" JSONB,
    "payload_hash" TEXT NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "chain_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "title" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gis_risk_flags" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "distance_m" DOUBLE PRECISION NOT NULL,
    "layer_name" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gis_risk_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mom_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "payments_application_id_key" ON "payments"("application_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_proponent_id_fkey" FOREIGN KEY ("proponent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eds_notices" ADD CONSTRAINT "eds_notices_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eds_notices" ADD CONSTRAINT "eds_notices_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_chain" ADD CONSTRAINT "audit_chain_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_chain" ADD CONSTRAINT "audit_chain_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gis_risk_flags" ADD CONSTRAINT "gis_risk_flags_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
