# White Glove Europe research pack

Private `NEEDS_REVIEW` editorial candidates for Europe, the Mediterranean, and nearby Middle East hubs.

## Scope

- Target size: about **700** candidates
- Official tourism boards, attraction operators, municipal/cultural sites, and Jewish community/certifier sources only
- No OSM / Google Places listing sources
- No public copy, coordinates, hours, prices, or booking claims

## Files

- `schema.ts` — portable private-review contract (`wge-…` ids)
- `sources.ts` — official HTTPS source registry
- `candidates.ts` — source-backed candidates (always `NEEDS_REVIEW`)
- `validate.ts` / `validation.test.ts` — pack integrity checks

## Validate

```bash
npx tsx data/imports/white-glove-europe-batch/validate.ts
npx tsx --test data/imports/white-glove-europe-batch/validation.test.ts
```

Regenerate from `scripts/generate-editorial-packs.cjs` when expanding markets. Do not publish from this pack.
