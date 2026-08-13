-- Useful links per destination: somewhere else worth reading about this town.
-- Distinct from Destination.sourceUrl/sources (where our facts came from) and
-- from PracticalPlace (a thing with an address).
CREATE TABLE IF NOT EXISTS "DestinationLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT NOT NULL,
    CONSTRAINT "DestinationLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DestinationLink_destinationId_position_idx"
    ON "DestinationLink"("destinationId", "position");

ALTER TABLE "DestinationLink"
    ADD CONSTRAINT "DestinationLink_destinationId_fkey"
    FOREIGN KEY ("destinationId") REFERENCES "Destination"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
