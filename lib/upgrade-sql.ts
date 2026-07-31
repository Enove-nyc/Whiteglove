/**
 * Bringing an OLDER database up to date, from the admin.
 *
 * `lib/init-sql.ts` is generated from the schema and builds a database from
 * empty. It cannot do anything else: it is a script of `CREATE TABLE`, so on a
 * database that already has those tables every statement fails with "already
 * exists" and is skipped. Adding a COLUMN to a table that is already there, or
 * a VALUE to an enum, is invisible to it.
 *
 * That is what this is for, and the pattern is not new — the old generated file
 * carried three hand-appended `ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS`
 * statements for exactly this reason. They were easy to lose the next time
 * somebody regenerated it, so they live here instead, apart from the generated
 * script and safe from it.
 *
 * EVERY STATEMENT MUST BE SAFE TO RUN TWICE, and one thing at a time. Postgres
 * fails a whole `ALTER TABLE ... ADD COLUMN a, ADD COLUMN b` if `a` already
 * exists, taking `b` down with it — which is precisely how a half-upgraded
 * database would be left half-upgraded for ever. So: one column per statement,
 * `IF NOT EXISTS` on all of it.
 *
 * This is not a replacement for `npm run db:migrate`; the migrations are the
 * record. It is the same destination reached by a route that needs no terminal,
 * for an owner who has one database and a browser.
 *
 * When a migration adds a column, add it here too.
 */
export const UPGRADE_SQL = String.raw`
-- Six kinds of listing added in July 2026. ADD VALUE IF NOT EXISTS so a rerun
-- is free; each on its own line because an enum value cannot be added and used
-- in the same transaction, and one failing must not take the others with it.
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'TEFILLOS';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'SHABBOS';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'HOSPITAL';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'EMERGENCY';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'GROCERY';
ALTER TYPE "PlaceCategory" ADD VALUE IF NOT EXISTS 'PARKING';

-- The page editor: blocks and the two SEO fields.
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "blocks" JSONB;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

-- How far a record has been checked, and when. Per record rather than per
-- page, because the parts of a destination are checked at different times.
-- Cemetery has no "verification" column: its own "status" is already a
-- VerificationStatus and carries that. Adding one produced a database the
-- schema then wanted to drop a column from, which is how this was caught.
ALTER TABLE "Cemetery" ADD COLUMN IF NOT EXISTS "lastVerified" TIMESTAMP(3);
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "lastVerified" TIMESTAMP(3);
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION';
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "sources" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PracticalPlace" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "PracticalPlace" ADD COLUMN IF NOT EXISTS "lastVerified" TIMESTAMP(3);
ALTER TABLE "PracticalPlace" ADD COLUMN IF NOT EXISTS "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION';

-- Permission to publish somebody's phone number, and why a listing is
-- featured. contactConsent defaults to FALSE: consent is given, never assumed.
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "contactConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "contactConsentAt" TIMESTAMP(3);
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "contactConsentNote" TEXT;
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "featuredReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "responseTime" TEXT;
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "DirectoryProvider" ADD COLUMN IF NOT EXISTS "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION';

-- A picture of one listing, and a picture sent in by a visitor. Both are on
-- the Photo table, which init-sql creates whole on a fresh database — these
-- are only for one that already had it.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedBy" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submittedEmail" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "submitterNote" TEXT;
CREATE INDEX IF NOT EXISTS "Photo_placeId_idx" ON "Photo"("placeId");
CREATE INDEX IF NOT EXISTS "Photo_submittedAt_idx" ON "Photo"("submittedAt");
DO $$ BEGIN
  ALTER TABLE "Photo" ADD CONSTRAINT "Photo_placeId_fkey"
    FOREIGN KEY ("placeId") REFERENCES "PracticalPlace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;
