-- Duplicate checks against the import queue were reading every candidate row
-- (ownedDuplicateFor in lib/content-imports.ts) to compare one new candidate
-- against the whole pack. That query is now narrowed to rows that can
-- plausibly match, on normalizedLocation and sourceId. Both need an index or
-- the narrowed query is still a full table scan and only the network cost
-- moves, not the read cost.
CREATE INDEX "ContentImportCandidate_normalizedLocation_idx" ON "ContentImportCandidate"("normalizedLocation");
CREATE INDEX "ContentImportCandidate_sourceId_idx" ON "ContentImportCandidate"("sourceId");
