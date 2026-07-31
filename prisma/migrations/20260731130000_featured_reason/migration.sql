-- Why a listing is featured, for the owner's own record.
--
-- The decision: a listing is featured either because its service has been
-- found consistently good, or because the placement is sponsored — and the
-- badge looks the same either way, so a visitor is not told which applies to
-- any particular listing. See lib/features.ts.
--
-- Kept out of every public read on purpose. What the directory does say, and
-- has to, is that SOME featured listings are sponsored; a badge that may mean
-- "they paid" and is indistinguishable from an editorial pick is exactly what
-- advertising rules are written to catch.
--
-- Additive, with a default, so existing rows are untouched. Empty means
-- nobody has recorded a reason yet, which is worth being able to see rather
-- than guessing one.

ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "featuredReason" TEXT NOT NULL DEFAULT '';
