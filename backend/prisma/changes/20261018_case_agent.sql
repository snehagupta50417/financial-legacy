-- Additive case-agent migration; does not modify existing tables.
SET search_path TO keeper;
-- CreateTable
CREATE TABLE "CaseAgentRun" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT '[]',
    "receipts" TEXT NOT NULL DEFAULT '[]',
    "result" TEXT,
    "error" TEXT,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseAgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseAgentRun_caseId_key" ON "CaseAgentRun"("caseId");

-- AddForeignKey
ALTER TABLE "CaseAgentRun" ADD CONSTRAINT "CaseAgentRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "LegacyCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;


REVOKE ALL ON "CaseAgentRun" FROM PUBLIC, anon, authenticated;
