# White Glove global research pack

Private `NEEDS_REVIEW` editorial candidates for the Americas, Asia-Pacific, and Africa.

## Scope

- Target size: about **650** candidates
- Official tourism boards, attraction operators, municipal/cultural sites, transit planners, and Jewish community/certifier sources only
- Complements `white-glove-fill-batch` and `worldwide-batch-2` (avoids their heavy hubs and Florida/Orlando)
- No OSM / Google Places listing sources
- No public copy, coordinates, hours, prices, or booking claims

## Files

- `schema.ts` — portable private-review contract (`wggb-…` ids)
- `sources.ts` — official HTTPS source registry
- `candidates.ts` — source-backed candidates (always `NEEDS_REVIEW`)
- `validate.ts` / `validation.test.ts` — pack integrity checks

## Validate

```bash
npx tsx data/imports/white-glove-global-batch/validate.ts
npx tsx --test data/imports/white-glove-global-batch/validation.test.ts
```

Regenerate from `scripts/generate-editorial-packs.cjs` when expanding markets. Do not publish from this pack.
