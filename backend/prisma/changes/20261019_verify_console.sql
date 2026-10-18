-- Additive Verify console migration (demo data only); does not modify existing tables.
SET search_path TO keeper;

CREATE TABLE "VerifyConsole" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyConsole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifyClaim" (
    "id" TEXT NOT NULL,
    "consoleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "deceasedName" TEXT NOT NULL,
    "claimantName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "contactMasked" TEXT NOT NULL,
    "productLabel" TEXT NOT NULL,
    "productLast4" TEXT NOT NULL,
    "amountMin" INTEGER NOT NULL,
    "amountMax" INTEGER NOT NULL,
    "route" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_review',
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "VerifyClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifyDocument" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "signals" TEXT NOT NULL DEFAULT '[]',
    "readable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VerifyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifyCheckRun" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskRule" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyCheckRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifyEvent" (
    "id" TEXT NOT NULL,
    "consoleId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerifyClaim_consoleId_key_key" ON "VerifyClaim"("consoleId", "key");
CREATE INDEX "VerifyClaim_consoleId_idx" ON "VerifyClaim"("consoleId");
CREATE INDEX "VerifyCheckRun_claimId_idx" ON "VerifyCheckRun"("claimId");
CREATE INDEX "VerifyEvent_claimId_idx" ON "VerifyEvent"("claimId");
CREATE INDEX "VerifyEvent_consoleId_idx" ON "VerifyEvent"("consoleId");

ALTER TABLE "VerifyClaim" ADD CONSTRAINT "VerifyClaim_consoleId_fkey" FOREIGN KEY ("consoleId") REFERENCES "VerifyConsole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifyDocument" ADD CONSTRAINT "VerifyDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "VerifyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifyCheckRun" ADD CONSTRAINT "VerifyCheckRun_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "VerifyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifyEvent" ADD CONSTRAINT "VerifyEvent_consoleId_fkey" FOREIGN KEY ("consoleId") REFERENCES "VerifyConsole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifyEvent" ADD CONSTRAINT "VerifyEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "VerifyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

REVOKE ALL ON "VerifyConsole", "VerifyClaim", "VerifyDocument", "VerifyCheckRun", "VerifyEvent" FROM PUBLIC, anon, authenticated;
