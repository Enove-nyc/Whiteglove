# Running the database migrations

Deploying the site does **not** touch the database. `prisma migrate deploy` is
a separate command (`npm run db:migrate`) that has to be run deliberately, and
nothing in the build calls it. That is on purpose: a schema change against live
content should be something somebody decides to do, not a side effect of
pushing a branch.

## The one thing to know first

The live database was set up with `prisma db push`, which applies a schema
without recording a migration. It works, and it is why the site runs. What it
leaves behind is a database with **no migration history**, so the first thing
`npm run db:migrate` does is stop with:

```
Error: P3005
The database schema is not empty.
```

Nothing has changed at that point — it refuses before doing anything. The fix
is to tell Prisma that the original migration was already applied, once, and
then it works normally from then on.

## Applying them

With `DATABASE_URL` pointing at the database:

```bash
# Once, and only on a database that already has the tables:
npx prisma migrate resolve --applied 0_init

# Every time, including this first time:
npm run db:migrate
```

`migrate resolve` writes one row into a bookkeeping table. It does not run any
SQL against the content.

On a genuinely empty database — a new environment, a restore — skip the resolve
step; `npm run db:migrate` builds everything from scratch.

## What is on record

| Migration | What it does |
| --- | --- |
| `0_init` | The original tables. Predates the live database. |
| `20260731110000_catch_up_directory_attractions_stays` | Adds `DirectoryProvider`, `Attraction`, `KosherStay`, `KosherArea` and three `Page` columns, which had been added to the schema without a migration. Every statement is `IF NOT EXISTS`, so on the live database it does nothing. |
| `20260731120000_place_category_values` | Six new `PlaceCategory` values. |
| `20260731120100_verification_consent_and_photos` | Verification and consent columns, and the `Photo` table. |

## Why the enum is on its own

Adding a value to a Postgres enum is the one change that is not ordinary.
On PostgreSQL 11 and earlier it cannot run inside a transaction at all, and
Prisma runs each migration in one. On 12 and later it is allowed, but the new
value still cannot be *used* in the same transaction. Keeping it in its own
migration means that if it ever fails, it fails having changed nothing else.

Every line uses `ADD VALUE IF NOT EXISTS`, so an interrupted run can simply be
run again.

Neon is on PostgreSQL 14 or later, so this is expected to apply cleanly.

## If something goes wrong

Postgres applies DDL inside a transaction, so a migration that fails partway
rolls back — the database is left as it was, and `migrate deploy` refuses to
run later migrations until the failure is resolved. Read the error, fix the
migration, and run it again. Nothing in this set drops or rewrites data, so
there is no step where a failure could lose content.

## How this set was checked

Against a real PostgreSQL 16, not by reading it:

- **From empty** — all four migrations applied, and
  `prisma migrate diff --from-config-datasource --to-schema` reported no
  difference, meaning the migrations rebuild exactly the schema in
  `schema.prisma`.
- **Against a stand-in for the live database** — built with `db push` from the
  previous schema and filled with rows, then baselined and migrated. Every row
  survived unchanged, every new column took its default
  (`NEEDS_VERIFICATION`, `contactConsent = false`, `sources = {}`), and the
  same no-difference check passed.
- **Through the Prisma client** — read the migrated rows, wrote a `Photo`
  (which came back `DRAFT`, as intended), and wrote listings using the new
  `TEFILLOS`, `HOSPITAL` and `SHABBOS` categories.
