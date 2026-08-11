-- Private, idempotent Trello review cards for source-backed candidates.
-- Neither table has a foreign key to public content: moving a Trello card
-- must never publish or otherwise change a listing.

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

CREATE UNIQUE INDEX "TrelloCandidateReviewCard_candidateId_key" ON "TrelloCandidateReviewCard"("candidateId");
CREATE UNIQUE INDEX "TrelloCandidateReviewCard_trelloCardId_key" ON "TrelloCandidateReviewCard"("trelloCardId");
CREATE INDEX "TrelloCandidateReviewCard_status_idx" ON "TrelloCandidateReviewCard"("status");
CREATE INDEX "TrelloCandidateReviewCard_boardId_reviewListId_idx" ON "TrelloCandidateReviewCard"("boardId", "reviewListId");
