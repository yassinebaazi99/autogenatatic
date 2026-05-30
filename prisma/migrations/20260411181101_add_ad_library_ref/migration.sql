-- CreateTable
CREATE TABLE "AdLibraryRef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT,
    "label" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "analysis" TEXT,
    "analysisError" TEXT,
    "analyzedAt" DATETIME,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdLibraryRef_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdLibraryRef_brandId_idx" ON "AdLibraryRef"("brandId");
