-- CreateTable
CREATE TABLE "LanderProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "landerType" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LanderProjectFile_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LanderProjectFile_brandId_idx" ON "LanderProjectFile"("brandId");

-- CreateIndex
CREATE INDEX "LanderProjectFile_brandId_landerType_idx" ON "LanderProjectFile"("brandId", "landerType");

-- CreateIndex
CREATE INDEX "LanderProjectFile_brandId_landerType_slot_idx" ON "LanderProjectFile"("brandId", "landerType", "slot");
