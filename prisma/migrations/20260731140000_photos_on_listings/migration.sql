-- A picture of one listing.
--
-- Photos could already hang off a town or a beis hachaim. What was missing was
-- the level people actually want a picture at: this hotel, this shul, this
-- mikvah. A town-level photo says what the place looks like; a listing photo
-- says what THIS one looks like, which is the question somebody choosing
-- between two hotels is asking.
--
-- Additive and nullable, so every photo already stored stays exactly as it is
-- — a town photo has no placeId and does not want one.
--
-- ON DELETE CASCADE: removing a listing removes its pictures. A photo of a
-- hotel that is no longer listed belongs to nothing, and an orphan row here
-- would show up in no screen and never be cleaned up.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "placeId" TEXT;

CREATE INDEX IF NOT EXISTS "Photo_placeId_idx" ON "Photo"("placeId");

DO $$ BEGIN
  ALTER TABLE "Photo" ADD CONSTRAINT "Photo_placeId_fkey"
    FOREIGN KEY ("placeId") REFERENCES "PracticalPlace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
