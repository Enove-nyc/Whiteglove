-- A private queue for source-backed bulk candidates. It deliberately has no
-- foreign key to a public listing: publishing is an explicit editorial action
-- that chooses the appropriate target model.

CREATE TYPE "ContentImportKind" AS ENUM ('ATTRACTION', 'KOSHER_FOOD', 'PLACE_TO_STAY', 'PRACTICAL');

CREATE TYPE "ContentImportStatus" AS ENUM ('NEEDS_REVIEW', 'DUPLICATE', 'REJECTED', 'PUBLISHED');

CREATE TABLE "ContentImportBatch" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "license" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentImportCandidate" (
    "id" TEXT NOT NULL,
    "kind" "ContentImportKind" NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL,
    "destinationSlug" TEXT,
    "address" TEXT,
    "coordinates" TEXT,
    "website" TEXT,
    "summary" TEXT,
    "anchorName" TEXT,
    "anchorCoords" TEXT,
    "kosherClaim" TEXT NOT NULL DEFAULT 'none',
    "kosherSourceUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "license" TEXT,
    "sourceEvidence" JSONB,
    "normalizedName" TEXT NOT NULL,
    "normalizedLocation" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "ContentImportStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duplicateOf" TEXT,
    "publishedKind" TEXT,
    "publishedId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "ContentImportCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentImportBatch_slug_key" ON "ContentImportBatch"("slug");
CREATE UNIQUE INDEX "ContentImportCandidate_dedupeKey_key" ON "ContentImportCandidate"("dedupeKey");
CREATE INDEX "ContentImportBatch_createdAt_idx" ON "ContentImportBatch"("createdAt");
CREATE INDEX "ContentImportCandidate_batchId_status_idx" ON "ContentImportCandidate"("batchId", "status");
CREATE INDEX "ContentImportCandidate_kind_status_idx" ON "ContentImportCandidate"("kind", "status");
CREATE INDEX "ContentImportCandidate_country_city_idx" ON "ContentImportCandidate"("country", "city");

ALTER TABLE "ContentImportCandidate"
  ADD CONSTRAINT "ContentImportCandidate_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ContentImportBatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
