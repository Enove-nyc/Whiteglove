-- Public place reviews: a signed-in traveler's 1-3 rating of a place, in
-- their own words, published immediately under their initials. Distinct from
-- "ExperienceRating", which is private feedback for the owner and never
-- publishes. One review per account per place (the unique index); "status" is
-- PUBLISHED or REMOVED, and "reportCount" over zero is the admin's queue.
--
-- IF NOT EXISTS throughout, because a deploy may meet a database the admin's
-- setup button has already given the table to.
CREATE TABLE IF NOT EXISTS "PlaceReview" (
    "id" TEXT NOT NULL,
    "placeKind" TEXT NOT NULL,
    "placeRef" TEXT NOT NULL,
    "placeLabel" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "authorEmail" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlaceReview_placeKind_placeRef_authorEmail_key" ON "PlaceReview"("placeKind", "placeRef", "authorEmail");

CREATE INDEX IF NOT EXISTS "PlaceReview_placeKind_placeRef_status_idx" ON "PlaceReview"("placeKind", "placeRef", "status");

CREATE INDEX IF NOT EXISTS "PlaceReview_reportCount_idx" ON "PlaceReview"("reportCount");
