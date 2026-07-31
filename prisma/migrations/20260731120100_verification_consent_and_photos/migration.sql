-- Somewhere to record what has been checked, who said we could publish their
-- number, and where a picture came from.
--
-- EVERY CHANGE HERE IS ADDITIVE. No column is dropped, no column is renamed,
-- no existing value is rewritten, and nothing is made NOT NULL without a
-- default. A row that exists today is a valid row after this runs, unchanged.
-- That is deliberate: this goes against live content.
--
-- The one table created, "Photo", is new and empty.
--
-- Every new column that cannot be null carries a default, so existing rows
-- fill in without a rewrite of their contents:
--
--   verification   -> NEEDS_VERIFICATION, because unchecked is the truth about
--                     a record nobody has checked. Defaulting to VERIFIED
--                     would silently claim the whole site had been checked.
--   contactConsent -> false, because consent to publish somebody's personal
--                     phone number is not something to assume. Absent means
--                     absent, and the number stays held but unpublished.
--   sources        -> an empty list.
--   sortOrder      -> 0.
--
-- TO APPLY:  npm run db:migrate      (prisma migrate deploy)
-- This is NOT part of the build, so deploying the site does not run it.

-- AlterTable
-- verification answers "how far has this been checked", which is a different
-- question from status ("is this live"). It is what becomes "Verified on
-- 3 March 2026" on a page. sources holds the rest of where a page came from —
-- sourceUrl keeps the single original one.
ALTER TABLE "Destination" ADD COLUMN     "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION';

-- AlterTable
-- "Verified" with no date is a claim with no age. A cemetery already carries
-- a verification status; this is when somebody last looked.
ALTER TABLE "Cemetery" ADD COLUMN     "lastVerified" TIMESTAMP(3);

-- AlterTable
-- Per listing, because the sections of a destination page are checked
-- separately and at different times. destinationTrust() is deliberately
-- pessimistic — one checked section out of five reads as "partially verified"
-- — and it can only be that honest if each listing carries its own answer.
ALTER TABLE "PracticalPlace" ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION';

-- AlterTable
-- CONSENT TO PUBLISH A PERSONAL NUMBER, and how quickly somebody answers.
--
-- Many providers are one person with a mobile rather than a business with a
-- switchboard. Publishing somebody's own number is not something to infer
-- from their having once given it to us. contactConsent defaults to false so
-- the flag has to be set by somebody who actually asked, and
-- contactConsentNote records how it was given — "asked by phone, 4 March" —
-- so the answer to "who said we could" is not somebody's memory.
--
-- responseTime is free text on purpose. "Same day" is a description; a number
-- of hours implies a measurement nobody is taking.
ALTER TABLE "DirectoryProvider" ADD COLUMN     "contactConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactConsentAt" TIMESTAMP(3),
ADD COLUMN     "contactConsentNote" TEXT,
ADD COLUMN     "responseTime" TEXT,
ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
-- A photograph belongs to whoever took it, and the site cannot publish one on
-- the strength of having found it. credit and sourceUrl are how that stays
-- traceable; status defaults to DRAFT so nothing appears on a public page the
-- moment it is uploaded, which matters most for pictures of kevarim.
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "credit" TEXT,
    "sourceUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT,
    "cemeteryId" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Photo_destinationId_idx" ON "Photo"("destinationId");

-- CreateIndex
CREATE INDEX "Photo_cemeteryId_idx" ON "Photo"("cemeteryId");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
