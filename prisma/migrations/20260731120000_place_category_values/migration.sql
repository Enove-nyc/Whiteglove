-- Six new words for what a place can be.
--
-- Four of them are things lib/verification.ts has been counting as missing
-- from every destination on the site because there was nowhere to put them:
-- tefillos, Shabbos arrangements, hospital, emergency services. GROCERY and
-- PARKING come with them because an enum is a vocabulary, and adding one word
-- later costs another migration with exactly this much care.
--
-- WHY THIS IS ITS OWN MIGRATION, SEPARATE FROM THE COLUMNS.
--
-- Adding a value to a Postgres enum is the one change here that is not
-- ordinary. On PostgreSQL 11 and earlier it cannot run inside a transaction
-- block at all, and Prisma runs each migration in one; on 12 and later it is
-- allowed, but the new value still cannot be USED in the same transaction.
-- Keeping it alone means that if it fails, it fails having changed nothing
-- else, and the columns in the next migration are untouched.
--
-- Neon runs PostgreSQL 14 or later, so this is expected to apply cleanly.
--
-- IF NOT EXISTS makes each line safe to run again. If the migration is
-- interrupted half way, re-running it finishes the job rather than failing on
-- the values that already landed.
--
-- Nothing reads these values yet, and no existing row changes. An enum with
-- more words in it is not a different enum to anything already stored.

ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'TEFILLOS';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'SHABBOS';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'HOSPITAL';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'EMERGENCY';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'GROCERY';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'PARKING';
