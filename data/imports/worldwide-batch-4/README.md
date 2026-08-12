# White Glove worldwide batch 4

Private, source-backed staging pack. Every row is `NEEDS_REVIEW` with prefilled
`listingLabel`, bulk `category`, customer-facing `summary`, and `address` (plus
`coordinates` when known) so the owner can verify and publish — nothing here goes
public on its own.

## Coverage

Roughly 5,000+ candidates across geographic gaps left after batches 2–3 and the
Europe / global / fill packs (US Jewish hubs and secondary metros, Israel
secondary cities, Western/Central Europe, LatAm, Asia, Africa, Oceania, Gulf).

Listing mix includes:

- Attractions (frum-appropriate parks, museums, landmarks — not kosher-only)
- Jewish heritage attractions when available
- Shuls (`MINYAN`)
- Mikvaos (`MIKVAH`)
- Beis hachaim / kever sites (taxonomy categories `Beis hachaim` / `Kever`)
- Where to stay neighbourhood anchors
- Vacation destinations and community resources

IDs use the `wgb4-` prefix so they do not collide with earlier packs.

## Files

- `schema.ts` — portable contract including `listingLabel`, `summary`, `address`
- `_catalog-part1.mjs` … `_catalog-part6.mjs` — curated city seeds
- `generate.mjs` — rebuilds `sources.ts` / `candidates.ts` from catalog parts
- `sources.ts` — first-party source registry (generated)
- `candidates.ts` — resolved candidates (generated)
- `validate.ts` — count and integrity checks

## Rebuild

```bash
node data/imports/worldwide-batch-4/generate.mjs
npx tsx data/imports/worldwide-batch-4/validate.ts
```

## Admin

- **Needs review** — `/admin/imports/needs-review` (source-pack rows while unstaged)
- **Bulk imports** — `/admin/imports` → **Stage this pack**, then review/publish one by one

Audience standard: attractions and lodging must suit Orthodox / Torah-observant
travellers; they do not need a kosher label. No nightlife, clubs, or mixed concerts.
