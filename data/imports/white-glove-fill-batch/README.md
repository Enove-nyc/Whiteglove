# White Glove fill batch

Private complementary source pack for markets not heavily covered by the Europe or Global editorial packs. Staging only — no public publish path, no admin route registration, no OSM/Google Places harvest.

## Coverage (94 candidates)

| Market cluster | Count | Notes |
| --- | --- | --- |
| United States | 21 | Chicago |
| South Korea | 20 | Seoul |
| Hong Kong | 19 | Harbour / Peak / cultural sites |
| Netherlands | 18 | Amsterdam attractions only (destination already in core) |
| New Zealand | 16 | Auckland |

Entity mix: 4 vacation destinations · 82 attractions · 4 Where to stay anchors · 4 practical community / certifier resources.

## Files

- `schema.ts` — portable contract, stable IDs (`wgfb-…`), normalized dedupe keys
- `sources.ts` — official tourism / museum / community / certifier registry
- `candidates.ts` — `whiteGloveFillCandidates`
- `validate.ts` — pack validator

## Rules

- Every row is `publicationReadiness: NEEDS_REVIEW`
- No addresses, coordinates, hours, phones, prices, or booking claims
- Sources are official boards, museums, community organisations, or certifiers only
- Attractions need not be Jewish places or kosher establishments; they must remain suitable for Orthodox / Torah-observant travelers (no clubs, nightlife, mixed concerts, or similar)
- Map tiles ≠ directory data: this pack never uses OpenStreetMap or Google Places as listing sources

## Validation

```bash
npx tsx data/imports/white-glove-fill-batch/validate.ts
npx tsx --test data/imports/white-glove-fill-batch/validation.test.ts
```
