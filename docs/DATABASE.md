# Content database (Neon Postgres + Prisma)

This is the foundation for moving destination/CMS content out of hardcoded
`data/*.ts` files and the write-only Redis admin bundle into a real,
admin-editable relational database.

**Status:** schema + client + seed script are in place and validated. The
database itself is not provisioned yet, and the public pages don't read from
it yet (that's the next step — see "What's next"). Nothing here changes what
the live site shows until those steps are done.

## What's on Redis and staying there

Accounts, sessions, analytics counters, and the site lock remain on Upstash
Redis — that's the right tool for them. Only content (destinations, cemeteries,
tzaddikim, practical listings) and the CMS tables (promotions, edit
suggestions, site settings, pages) move to Postgres.

## One-time setup (this part needs you — I can't provision DBs or set env vars)

1. **Create a Neon project** at https://neon.tech (free tier is fine). Copy the
   **pooled** connection string — it looks like:
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`

2. **Add it to Vercel:** Project → Settings → Environment Variables → add
   `DATABASE_URL` = that string, for Production (and Preview/Development if you
   want). Redeploy from the newest commit afterward.

3. **Add it locally** (for running migrations/seed from your machine): create a
   `.env` file in the repo root with:
   ```
   DATABASE_URL="postgresql://...your neon pooled string..."
   ```
   `.env` is gitignored — it will not be committed.

## Create the tables and load the data

From the repo root, with `DATABASE_URL` set:

```bash
npm install                      # installs Prisma, generates the client
npx prisma migrate dev --name init   # creates all tables (first time)
npx prisma db seed               # imports data/*.ts into the database
```

Verify the mapping first without a database (no connection made):

```bash
SEED_DRY_RUN=1 npx tsx prisma/seed.ts
```

It reports what it would insert. Current data yields ~136 destinations
(13 city guides + 109 bulk + 14 sacred stops), 43 tzaddikim, 14 cemeteries,
and 10 contacts.

Re-running `db seed` wipes and reloads the imported **content** tables
(Destination, Tzaddik, Cemetery, Contact, PracticalPlace). It does not touch
admin-owned tables (Promotion, EditSuggestion, Page); SiteSetting is only
created if missing.

## Files

- `prisma/schema.prisma` — the data model.
- `prisma.config.ts` — Prisma 7 config (connection URL + seed command live
  here, not in the schema, per Prisma 7).
- `prisma/seed.ts` — imports `data/*.ts` into the DB (supports `SEED_DRY_RUN`).
- `lib/prisma.ts` — the Prisma client singleton (Neon serverless adapter).

## The schema at a glance

- **Destination** — every city/place. `kind` = CITY_GUIDE | DESTINATION |
  SACRED_STOP preserves which template it came from. Has many tzaddikim,
  cemeteries, contacts, and practical places.
- **Tzaddik** — a tzaddik, either the primary one featured on a city page
  (`isPrimary`) or one of several buried in a cemetery.
- **Cemetery** — a beis hachaim, with its burials (tzaddikim) and access
  contacts.
- **Contact** — a shomer/access contact, attached to a destination or cemetery.
- **PracticalPlace** — one table for lodging, kosher food, minyanim, mikvaos,
  transport, airports, and drivers (via `category`).
- **Promotion / EditSuggestion / SiteSetting / Page** — the CMS tables that
  currently live in the Redis content bundle.

## What's next (not done yet)

1. Point the public pages (`app/[city]`, `app/destinations/[place]`,
   `app/cemeteries/[cemetery]`) at Prisma instead of `data/*.ts`, with
   on-demand revalidation so admin edits appear without a redeploy. This is the
   step that finally connects the admin editor to what visitors see — the core
   goal. (Requires reading the Next 16 rendering/revalidation docs first, per
   `AGENTS.md`.)
2. Repoint the admin API routes (`app/api/admin/content`) from the Redis bundle
   to Prisma.
3. Fill in the real `PracticalPlace` data that's currently placeholder
   "unavailable" stubs.
