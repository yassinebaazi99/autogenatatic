-- CreateTable
CREATE TABLE "Lander" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "jobId" TEXT,
    "landerType" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outputDir" TEXT NOT NULL,
    "intake" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lander_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lander_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LanderSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landerId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "promptTokens" INTEGER,
    "outputTokens" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "userEdit" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "LanderSection_landerId_fkey" FOREIGN KEY ("landerId") REFERENCES "Lander" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LanderStaticLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landerId" TEXT NOT NULL,
    "staticAdId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LanderStaticLink_landerId_fkey" FOREIGN KEY ("landerId") REFERENCES "Lander" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LanderStaticLink_staticAdId_fkey" FOREIGN KEY ("staticAdId") REFERENCES "StaticAd" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lander_slug_key" ON "Lander"("slug");

-- CreateIndex
CREATE INDEX "Lander_brandId_idx" ON "Lander"("brandId");

-- CreateIndex
CREATE INDEX "Lander_jobId_idx" ON "Lander"("jobId");

-- CreateIndex
CREATE INDEX "LanderSection_landerId_idx" ON "LanderSection"("landerId");

-- CreateIndex
CREATE UNIQUE INDEX "LanderSection_landerId_sectionId_key" ON "LanderSection"("landerId", "sectionId");

-- CreateIndex
CREATE INDEX "LanderStaticLink_landerId_idx" ON "LanderStaticLink"("landerId");

-- CreateIndex
CREATE INDEX "LanderStaticLink_staticAdId_idx" ON "LanderStaticLink"("staticAdId");

-- CreateIndex
CREATE UNIQUE INDEX "LanderStaticLink_landerId_staticAdId_key" ON "LanderStaticLink"("landerId", "staticAdId");
