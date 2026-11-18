-- The large private review packs, gzipped and base64-encoded, so they no longer
-- have to be compiled into the site's server code. See lib/import-packs.ts.
CREATE TABLE IF NOT EXISTS "ImportPack" (
    "key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportPack_pkey" PRIMARY KEY ("key")
);
