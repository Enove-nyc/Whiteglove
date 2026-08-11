// Auto-generated from prisma/schema.prisma. Do NOT hand-edit.
//
// The /api/admin/db-setup route executes this to create the tables, because a
// migration cannot be run against the database from every environment.
//
// WHAT IT CAN AND CANNOT DO. It is a from-empty script, so on a fresh database
// it builds everything. On a database that already has tables, lib/db-setup.ts
// runs it statement by statement and swallows "already exists" — which adds a
// whole NEW table, but cannot add a column to a table that is already there,
// and cannot add a value to an enum. Those need `npm run db:migrate`, and the
// admin screen says so rather than implying the button is enough.
//
// Regenerate:
//   npm run build:sql
export const INIT_SQL = String.raw`
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DestinationKind" AS ENUM ('CITY_GUIDE', 'DESTINATION', 'SACRED_STOP');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ContentImportKind" AS ENUM ('ATTRACTION', 'KOSHER_FOOD', 'PLACE_TO_STAY', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "ContentImportStatus" AS ENUM ('NEEDS_REVIEW', 'DUPLICATE', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNAVAILABLE', 'NEEDS_VERIFICATION');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('ACCOMMODATION', 'KOSHER_FOOD', 'MINYAN', 'MIKVAH', 'TRANSPORT', 'AIRPORT', 'DRIVER', 'TEFILLOS', 'SHABBOS', 'HOSPITAL', 'EMERGENCY', 'GROCERY', 'PARKING');

-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('TOUR_OPERATOR', 'VACATION_PLANNER', 'TRAVEL_AGENCY', 'GUIDE_DRIVER');

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "DestinationKind" NOT NULL DEFAULT 'DESTINATION',
    "city" TEXT NOT NULL,
    "yiddishCity" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overview" TEXT,
    "summary" TEXT,
    "safetyNote" TEXT,
    "sourceUrl" TEXT,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tzaddik" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yiddishName" TEXT NOT NULL,
    "knownAs" TEXT,
    "seforim" TEXT,
    "yahrzeit" TEXT,
    "niftar" TEXT,
    "graveAddress" TEXT,
    "graveCoordinates" TEXT,
    "findingNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "source" TEXT,
    "destinationId" TEXT,
    "cemeteryId" TEXT,

    CONSTRAINT "Tzaddik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "yiddishCity" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yiddishName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "coordinates" TEXT,
    "arrivalNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessNote" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT,

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "source" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "destinationId" TEXT,
    "cemeteryId" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalPlace" (
    "id" TEXT NOT NULL,
    "category" "PlaceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "yiddishName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bookingLink" TEXT,
    "coordinates" TEXT,
    "hours" TEXT,
    "amenities" TEXT,
    "kosherInfo" TEXT,
    "notes" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "PracticalPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "address" TEXT,
    "coordinates" TEXT,
    "website" TEXT,
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shabbos" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KosherStay" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "anchorName" TEXT NOT NULL,
    "anchorCoords" TEXT NOT NULL,
    "season" TEXT,
    "kosherClaim" TEXT NOT NULL DEFAULT 'none',
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KosherStay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KosherArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coordinates" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KosherArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "TrelloCandidateReviewSettings" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "reviewListId" TEXT NOT NULL,
    "doneListId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrelloCandidateReviewSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrelloCandidateReviewCard" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "reviewListId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "trelloCardId" TEXT,
    "cardUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrelloCandidateReviewCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "credit" TEXT,
    "sourceUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT,
    "cemeteryId" TEXT,
    "placeId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "submittedEmail" TEXT,
    "submitterNote" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditSuggestion" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "currentInfo" TEXT NOT NULL DEFAULT '',
    "suggestedInfo" TEXT NOT NULL DEFAULT '',
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "EditSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT '',
    "targetHref" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "pdfUrl" TEXT,
    "placements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetPaths" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT 'all',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxViewsPerVisitor" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastShownAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "heroTitle" TEXT NOT NULL,
    "heroSubtitle" TEXT NOT NULL,
    "searchPlaceholder" TEXT NOT NULL,
    "publicNotice" TEXT NOT NULL,
    "footerEmail" TEXT NOT NULL,
    "bookingNotice" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryProvider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "basedIn" TEXT,
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredReason" TEXT NOT NULL DEFAULT '',
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "contactConsentAt" TIMESTAMP(3),
    "contactConsentNote" TEXT,
    "responseTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "blocks" JSONB,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "Destination_kind_idx" ON "Destination"("kind");

-- CreateIndex
CREATE INDEX "Destination_country_idx" ON "Destination"("country");

-- CreateIndex
CREATE INDEX "Tzaddik_destinationId_idx" ON "Tzaddik"("destinationId");

-- CreateIndex
CREATE INDEX "Tzaddik_cemeteryId_idx" ON "Tzaddik"("cemeteryId");

-- CreateIndex
CREATE UNIQUE INDEX "Cemetery_slug_key" ON "Cemetery"("slug");

-- CreateIndex
CREATE INDEX "Cemetery_destinationId_idx" ON "Cemetery"("destinationId");

-- CreateIndex
CREATE INDEX "Contact_destinationId_idx" ON "Contact"("destinationId");

-- CreateIndex
CREATE INDEX "Contact_cemeteryId_idx" ON "Contact"("cemeteryId");

-- CreateIndex
CREATE INDEX "PracticalPlace_destinationId_category_idx" ON "PracticalPlace"("destinationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_slug_key" ON "Attraction"("slug");

-- CreateIndex
CREATE INDEX "Attraction_country_city_idx" ON "Attraction"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "KosherStay_slug_key" ON "KosherStay"("slug");

-- CreateIndex
CREATE INDEX "KosherStay_country_city_idx" ON "KosherStay"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "KosherArea_slug_key" ON "KosherArea"("slug");

-- CreateIndex
CREATE INDEX "KosherArea_country_city_idx" ON "KosherArea"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "ContentImportBatch_slug_key" ON "ContentImportBatch"("slug");

-- CreateIndex
CREATE INDEX "ContentImportBatch_createdAt_idx" ON "ContentImportBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentImportCandidate_dedupeKey_key" ON "ContentImportCandidate"("dedupeKey");

-- CreateIndex
CREATE INDEX "ContentImportCandidate_batchId_status_idx" ON "ContentImportCandidate"("batchId", "status");

-- CreateIndex
CREATE INDEX "ContentImportCandidate_kind_status_idx" ON "ContentImportCandidate"("kind", "status");

-- CreateIndex
CREATE INDEX "ContentImportCandidate_country_city_idx" ON "ContentImportCandidate"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "TrelloCandidateReviewCard_candidateId_key" ON "TrelloCandidateReviewCard"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "TrelloCandidateReviewCard_trelloCardId_key" ON "TrelloCandidateReviewCard"("trelloCardId");

-- CreateIndex
CREATE INDEX "TrelloCandidateReviewCard_status_idx" ON "TrelloCandidateReviewCard"("status");

-- CreateIndex
CREATE INDEX "TrelloCandidateReviewCard_boardId_reviewListId_idx" ON "TrelloCandidateReviewCard"("boardId", "reviewListId");

-- CreateIndex
CREATE INDEX "Photo_destinationId_idx" ON "Photo"("destinationId");

-- CreateIndex
CREATE INDEX "Photo_cemeteryId_idx" ON "Photo"("cemeteryId");

-- CreateIndex
CREATE INDEX "Photo_placeId_idx" ON "Photo"("placeId");

-- CreateIndex
CREATE INDEX "Photo_submittedAt_idx" ON "Photo"("submittedAt");

-- CreateIndex
CREATE INDEX "EditSuggestion_status_idx" ON "EditSuggestion"("status");

-- CreateIndex
CREATE INDEX "Promotion_enabled_priority_idx" ON "Promotion"("enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryProvider_slug_key" ON "DirectoryProvider"("slug");

-- CreateIndex
CREATE INDEX "DirectoryProvider_category_idx" ON "DirectoryProvider"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- AddForeignKey
ALTER TABLE "Tzaddik" ADD CONSTRAINT "Tzaddik_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tzaddik" ADD CONSTRAINT "Tzaddik_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalPlace" ADD CONSTRAINT "PracticalPlace_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentImportCandidate" ADD CONSTRAINT "ContentImportCandidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "PracticalPlace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;
