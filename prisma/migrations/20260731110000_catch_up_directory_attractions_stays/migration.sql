-- Catching the migrations up to the schema.
--
-- FOUND WHILE PREPARING THE NEXT TWO MIGRATIONS, by running them against a
-- real PostgreSQL 16 rather than reading them. `prisma migrate deploy` on an
-- empty database failed with:
--
--     relation "DirectoryProvider" does not exist
--
-- because the only migration on record, 0_init, predates four models that
-- have since been added to schema.prisma and are used by live pages:
--
--     DirectoryProvider  (+ the ProviderCategory enum)  -> /directory
--     Attraction                                        -> /attractions
--     KosherStay                                        -> /kosher-stays
--     KosherArea                                        -> /kosher-stays
--     Page.blocks, Page.seoTitle, Page.seoDescription   -> the page editor
--
-- Whoever set the live database up used `prisma db push`, which applies a
-- schema without recording a migration. That works, and it is why the site
-- runs; what it leaves behind is a migrations directory that cannot rebuild
-- the database it is supposed to describe.
--
-- WHY EVERY STATEMENT IS "IF NOT EXISTS".
--
-- This has to be correct in two different worlds and cannot tell which one it
-- is in. On the live database these tables are already there, and this
-- migration must do nothing at all. On a fresh one — a new environment, a
-- restore, a second region — they are missing, and it must create them. Every
-- statement below is written so that both are the same statement.
--
-- Nothing here drops, renames or rewrites anything.
--
-- The SQL itself is Prisma's own, from
--   prisma migrate diff --from-config-datasource --to-schema
-- with the existence guards added.

-- CreateEnum
-- CREATE TYPE has no IF NOT EXISTS, so the duplicate is caught instead.
DO $$ BEGIN
  CREATE TYPE "ProviderCategory" AS ENUM ('TOUR_OPERATOR', 'VACATION_PLANNER', 'TRAVEL_AGENCY', 'GUIDE_DRIVER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "blocks" JSONB,
ADD COLUMN IF NOT EXISTS "seoDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "seoTitle" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE IF NOT EXISTS "Attraction" (
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
CREATE TABLE IF NOT EXISTS "KosherStay" (
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
CREATE TABLE IF NOT EXISTS "KosherArea" (
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
CREATE TABLE IF NOT EXISTS "DirectoryProvider" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Attraction_slug_key" ON "Attraction"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attraction_country_city_idx" ON "Attraction"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "KosherStay_slug_key" ON "KosherStay"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KosherStay_country_city_idx" ON "KosherStay"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "KosherArea_slug_key" ON "KosherArea"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KosherArea_country_city_idx" ON "KosherArea"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DirectoryProvider_slug_key" ON "DirectoryProvider"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DirectoryProvider_category_idx" ON "DirectoryProvider"("category");
