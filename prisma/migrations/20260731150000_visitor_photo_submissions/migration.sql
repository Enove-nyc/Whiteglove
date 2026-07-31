-- A picture sent in by a visitor.
--
-- The owner asked for this and asked for one condition with it: nothing a
-- stranger sends appears on the site until he confirms it. That condition is
-- already enforced by `status`, which defaults to DRAFT — what was missing was
-- any way to tell a stranger's picture from the owner's own unfinished one.
-- They looked identical in the admin, and the difference matters: publishing
-- your own draft is a decision, publishing somebody else's is a liability.
--
-- `submittedAt` is the marker. Non-null means it came from outside. The other
-- three are who sent it and anything they wanted to say, so the owner can
-- write back before deciding.
--
-- All four are additive and nullable, so every picture already stored stays
-- exactly what it is: uploaded by the owner, with nothing claimed about where
-- it came from.
--
-- Indexed on submittedAt so the review queue — "everything still waiting" —
-- is one indexed read rather than a scan of every picture on the site.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedBy" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedEmail" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submitterNote" TEXT;

CREATE INDEX IF NOT EXISTS "Photo_submittedAt_idx" ON "Photo"("submittedAt");
