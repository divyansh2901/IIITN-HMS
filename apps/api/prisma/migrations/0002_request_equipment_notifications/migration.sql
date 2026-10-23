ALTER TYPE "EquipmentIssueStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_RETURNED';
CREATE TYPE "HostelRequestStatus" AS ENUM ('PENDING_GUARD_REVIEW', 'REJECTED_BY_GUARD', 'FORWARDED_TO_ADMIN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED_BY_ADMIN');
CREATE TYPE "RequestHistoryAction" AS ENUM ('SUBMITTED', 'GUARD_APPROVED_AND_FORWARDED', 'GUARD_REJECTED', 'ADMIN_STARTED', 'ADMIN_COMPLETED', 'ADMIN_REJECTED');
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_STATUS', 'EQUIPMENT_OVERDUE', 'SYSTEM');

ALTER TABLE "EquipmentIssue" ADD COLUMN "quantityReturned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EquipmentIssue" ADD COLUMN "transactionReference" VARCHAR(40);
ALTER TABLE "EquipmentIssue" ADD COLUMN "idempotencyKey" VARCHAR(100);
UPDATE "EquipmentIssue" SET "expectedReturnAt" = COALESCE("expectedReturnAt", "issuedAt" + INTERVAL '1 day');
ALTER TABLE "EquipmentIssue" ALTER COLUMN "expectedReturnAt" SET NOT NULL;
UPDATE "EquipmentIssue" SET "transactionReference" = 'EQ-' || upper(substr(replace("id"::text, '-', ''), 1, 12)) WHERE "transactionReference" IS NULL;
ALTER TABLE "EquipmentIssue" ALTER COLUMN "transactionReference" SET NOT NULL;
ALTER TABLE "EquipmentIssue" ADD CONSTRAINT "EquipmentIssue_quantity_returned_valid" CHECK ("quantityReturned" >= 0 AND "quantityReturned" <= "quantity");
CREATE UNIQUE INDEX "EquipmentIssue_transactionReference_key" ON "EquipmentIssue"("transactionReference");
CREATE UNIQUE INDEX "EquipmentIssue_idempotencyKey_key" ON "EquipmentIssue"("idempotencyKey");
CREATE INDEX "EquipmentIssue_expectedReturnAt_status_idx" ON "EquipmentIssue"("expectedReturnAt", "status");

CREATE TABLE "RequestType" (
  "id" UUID NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "requiresLeaveDetails" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "HostelRequest" (
  "id" UUID NOT NULL,
  "referenceNumber" VARCHAR(32) NOT NULL,
  "studentId" UUID NOT NULL,
  "requestTypeId" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "departureAt" TIMESTAMPTZ(3),
  "expectedReturnAt" TIMESTAMPTZ(3),
  "destination" VARCHAR(255),
  "status" "HostelRequestStatus" NOT NULL DEFAULT 'PENDING_GUARD_REVIEW',
  "guardReviewerId" UUID,
  "guardDecisionAt" TIMESTAMPTZ(3),
  "guardRemarks" TEXT,
  "adminActorId" UUID,
  "processingStartedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "completionNotes" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "HostelRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RequestHistory" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "previousStatus" "HostelRequestStatus",
  "newStatus" "HostelRequestStatus" NOT NULL,
  "action" "RequestHistoryAction" NOT NULL,
  "actorId" UUID NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EquipmentReturn" (
  "id" UUID NOT NULL,
  "issueId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "returnedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedBy" UUID NOT NULL,
  "condition" "EquipmentCondition" NOT NULL,
  "idempotencyKey" VARCHAR(100),
  "notes" TEXT,
  CONSTRAINT "EquipmentReturn_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "relatedEntityType" VARCHAR(80),
  "relatedEntityId" VARCHAR(80),
  "dedupeKey" VARCHAR(180),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMPTZ(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequestType_code_key" ON "RequestType"("code");
CREATE UNIQUE INDEX "HostelRequest_referenceNumber_key" ON "HostelRequest"("referenceNumber");
CREATE INDEX "HostelRequest_studentId_createdAt_idx" ON "HostelRequest"("studentId", "createdAt");
CREATE INDEX "HostelRequest_status_createdAt_idx" ON "HostelRequest"("status", "createdAt");
CREATE INDEX "HostelRequest_requestTypeId_status_idx" ON "HostelRequest"("requestTypeId", "status");
CREATE INDEX "RequestHistory_requestId_createdAt_idx" ON "RequestHistory"("requestId", "createdAt");
CREATE INDEX "EquipmentReturn_issueId_returnedAt_idx" ON "EquipmentReturn"("issueId", "returnedAt");
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "EquipmentReturn_idempotencyKey_key" ON "EquipmentReturn"("idempotencyKey");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

ALTER TABLE "HostelRequest" ADD CONSTRAINT "HostelRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelRequest" ADD CONSTRAINT "HostelRequest_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelRequest" ADD CONSTRAINT "HostelRequest_guardReviewerId_fkey" FOREIGN KEY ("guardReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelRequest" ADD CONSTRAINT "HostelRequest_adminActorId_fkey" FOREIGN KEY ("adminActorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HostelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentReturn" ADD CONSTRAINT "EquipmentReturn_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "EquipmentIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EquipmentReturn" ADD CONSTRAINT "EquipmentReturn_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
