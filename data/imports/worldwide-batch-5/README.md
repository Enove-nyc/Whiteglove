# White Glove worldwide batch 5

Private, source-backed staging pack. Every row is `NEEDS_REVIEW` with prefilled
`listingLabel`, bulk `category`, customer-facing `summary`, and `address` so the
owner can verify and publish — nothing here goes public on its own.

## Coverage

About 15,000 candidates across geographic gaps left after batches 2–4 (US mid-tier
metros, Israel secondary cities, Western/Central/Eastern Europe, LatAm, Asia,
Africa, Oceania, Gulf / Central Asia).

Listing mix includes attractions, Jewish heritage, shuls (`MINYAN`), mikvaos,
beis hachaim / kevarim, where to stay, vacation destinations, and community
resources. IDs use the `wgb5-` prefix.

## Files

- `schema.ts` — portable contract
- `_cities-part1.mjs` … `_cities-part3.mjs` — gap-city seeds
- `generate.mjs` — rebuilds sources + chunked `_data-part*.json` + `candidates.ts`
- `_data-part1.json` … `_data-part6.json` — candidate draft chunks
- `sources.ts` / `candidates.ts` — resolved pack (generated)
- `validate.ts` — count, integrity, and cross-pack dedupe checks

## Rebuild

```bash
node data/imports/worldwide-batch-5/generate.mjs
npx tsx data/imports/worldwide-batch-5/validate.ts
```

## Admin

- **Needs review** — `/admin/imports/needs-review`
- **Bulk imports** — `/admin/imports` → **Stage this pack**, then review/publish one by one

Audience standard: attractions and lodging must suit Orthodox / Torah-observant
travellers; they do not need a kosher label. No nightlife, clubs, or mixed concerts.
