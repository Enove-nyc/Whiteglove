-- Holiday destinations the owner can edit without a deploy.
--
-- An OVERLAY on data/vacation-destinations.ts, not a copy of it: a row here
-- either overrides a built-in destination field by field, or adds one the file
-- never had. Every column below is nullable or defaults to an empty array
-- because an empty field means "leave the built-in text alone".
CREATE TABLE IF NOT EXISTS "VacationDestination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "name" TEXT,
    "country" TEXT,
    "region" TEXT,
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kosherBaseCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kosherBaseNote" TEXT,
    "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyGo" TEXT,
    "bestFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestedLength" TEXT,
    "overview" TEXT,
    "whyVisit" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestTime" TEXT,
    "suits" TEXT,
    "transport" TEXT,
    "outlineTitle" TEXT,
    "outlineDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cautions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VacationDestination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VacationDestination_slug_key"
    ON "VacationDestination"("slug");

-- A picture of a holiday destination. The site has never had one; the Photo
-- table already carries the credit rule that decides whether it may be shown.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "vacationDestinationId" TEXT;

ALTER TABLE "Photo"
    ADD CONSTRAINT "Photo_vacationDestinationId_fkey"
    FOREIGN KEY ("vacationDestinationId") REFERENCES "VacationDestination"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
