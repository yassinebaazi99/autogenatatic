-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "Job_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaticAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "adLibraryRefId" TEXT,
    "claudePrompt" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "regenNote" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaticAd_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaticAd_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaticAd_adLibraryRefId_fkey" FOREIGN KEY ("adLibraryRefId") REFERENCES "AdLibraryRef" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaticGenPromptHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adLibraryRefId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "claudePrompt" TEXT NOT NULL,
    "regenNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaticGenPromptHistory_adLibraryRefId_fkey" FOREIGN KEY ("adLibraryRefId") REFERENCES "AdLibraryRef" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaticGenPromptHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Job_brandId_idx" ON "Job"("brandId");

-- CreateIndex
CREATE INDEX "Job_kind_idx" ON "Job"("kind");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "StaticAd_brandId_idx" ON "StaticAd"("brandId");

-- CreateIndex
CREATE INDEX "StaticAd_jobId_idx" ON "StaticAd"("jobId");

-- CreateIndex
CREATE INDEX "StaticAd_brandId_status_idx" ON "StaticAd"("brandId", "status");

-- CreateIndex
CREATE INDEX "StaticGenPromptHistory_adLibraryRefId_idx" ON "StaticGenPromptHistory"("adLibraryRefId");

-- CreateIndex
CREATE INDEX "StaticGenPromptHistory_jobId_idx" ON "StaticGenPromptHistory"("jobId");
