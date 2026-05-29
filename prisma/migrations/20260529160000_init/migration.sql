CREATE TYPE "ResourceType" AS ENUM ('PERSON', 'CREW', 'EQUIPMENT', 'SUBCONTRACTOR');
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ResourceType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tags" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "projectRef" TEXT NOT NULL DEFAULT '',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'SCHEDULED',
  "workType" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "requiresEquipment" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assignment" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Resource_name_type_key" ON "Resource"("name", "type");
CREATE INDEX "Resource_type_idx" ON "Resource"("type");
CREATE INDEX "Job_startsAt_idx" ON "Job"("startsAt");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE UNIQUE INDEX "Assignment_jobId_resourceId_key" ON "Assignment"("jobId", "resourceId");
CREATE INDEX "Assignment_jobId_idx" ON "Assignment"("jobId");
CREATE INDEX "Assignment_resourceId_idx" ON "Assignment"("resourceId");

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
