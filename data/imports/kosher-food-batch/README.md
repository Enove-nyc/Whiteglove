# Kosher food review pack

Private `NEEDS_REVIEW` leads for the kosher food finder. Named restaurants, bakeries, groceries and community kitchens already sourced on this site — Chabad food directories, kehilla pages, and cemetery practical notes.

Nothing in this pack publishes. Bulk import cannot turn a directory row into a public kosher claim; the owner verifies each one in Needs review.

## Dedupe

Same pass as the worldwide packs: same name under two spellings, same address, same website, same slug in the same town, already on the public kosher food finder, or already in another import pack. Prefer drop when it may be the same door.

## What was refused

- Kosher-style, Israeli-style, or Jewish-themed restaurants without a kashrus source
- “Nearest food is in Warsaw” pointers (the named kitchen is listed under its city)
- Street-as-one-business corridors
- OSM / Overpass / Google Places

## Admin

- Needs review: `/admin/imports/needs-review`
- Stage: `/admin/imports` → Stage this pack, or `npx tsx scripts/stage-kosher-food-pack.ts`
