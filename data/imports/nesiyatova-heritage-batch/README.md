# Nesiya Tova heritage review pack

Private `NEEDS_REVIEW` leads from the public Nesiya Tova place directory
(`https://app.nesiyatova.com/`, feed `https://api.nesiyatova.com/api/mkmphone`).

Coverage is only:

- batei chayim (category 1) including listed shomer numbers when the source has them
- mikvaos (category 7)
- hachnasas orchim (category 4, אכסניא)

Food, airports, historical sites and synagogues are not in this pack. Rows stay
off the public site until the owner verifies each one. Beis hachaim / kevarim
are published from the kevarim admin, not from this queue.

## Rebuild

```bash
npx tsx data/imports/nesiyatova-heritage-batch/generate.ts
npx tsx data/imports/nesiyatova-heritage-batch/validate.ts
```

## Admin

- Needs review: `/admin/imports/needs-review`
- Bulk imports: `/admin/imports` → Stage this pack
