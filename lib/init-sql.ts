// Auto-generated from prisma/schema.prisma via `prisma migrate diff`.
// The /api/admin/db-setup route executes this to create tables at runtime,
// because migrations cannot be run against the database from every environment.
// Regenerate: npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
export const INIT_SQL = String.raw`
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DestinationKind" AS ENUM ('CITY_GUIDE', 'DESTINATION', 'SACRED_STOP');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'UNAVAILABLE', 'NEEDS_VERIFICATION');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('ACCOMMODATION', 'KOSHER_FOOD', 'MINYAN', 'MIKVAH', 'TRANSPORT', 'AIRPORT', 'DRIVER');

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
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
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
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "PracticalPlace_pkey" PRIMARY KEY ("id")
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
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
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
`;
