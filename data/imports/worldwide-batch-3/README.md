# White Glove worldwide batch 3

Private, source-backed staging pack. Every row is `NEEDS_REVIEW` with prefilled
`listingLabel`, bulk `category`, customer-facing `summary`, and `address` so the
owner can verify and publish — nothing here goes public on its own.

## Coverage

Roughly 2,000+ candidates across geographic gaps (US secondary cities, UK, Israel,
Central/Eastern Europe, LatAm, Asia, Oceania, Africa, Gulf).

Listing mix includes:

- Attractions (frum-appropriate parks, museums, landmarks — not kosher-only)
- Jewish heritage attractions when available
- Shuls (`MINYAN`)
- Mikvaos (`MIKVAH`)
- Beis hachaim / kever sites (staged as Jewish-heritage attractions for review)
- Where to stay neighbourhood anchors
- Vacation destinations and community resources

## Files

- `schema.ts` — portable contract including `listingLabel`, `summary`, `address`
- `sources.ts` — first-party source registry (generated)
- `candidates.ts` — resolved candidates (generated)
- `generate.mjs` — rebuilds `sources.ts` / `candidates.ts` from city seed parts
- `validate.ts` — count and integrity checks

## Rebuild

```bash
node data/imports/worldwide-batch-3/generate.mjs
npx tsx data/imports/worldwide-batch-3/validate.ts
```

## Admin

- **Needs review** — `/admin/imports/needs-review` (source-pack rows while unstaged)
- **Bulk imports** — `/admin/imports` (Stage this pack, then review/publish one by one)

Audience standard: attractions and lodging must suit Orthodox / Torah-observant
travellers; they do not need a kosher label. No nightlife, clubs, or mixed concerts.
