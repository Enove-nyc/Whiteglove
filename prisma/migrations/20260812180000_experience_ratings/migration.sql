-- Private experience ratings from travellers (listings / trips).
CREATE TABLE IF NOT EXISTS "ExperienceRating" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperienceRating_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExperienceRating_kind_ref_idx" ON "ExperienceRating"("kind", "ref");
CREATE INDEX IF NOT EXISTS "ExperienceRating_createdAt_idx" ON "ExperienceRating"("createdAt");
