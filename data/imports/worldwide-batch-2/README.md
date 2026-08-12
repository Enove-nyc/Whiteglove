# White Glove worldwide batch 2

Private, source-backed staging pack for the centralized bulk importer. It is not a public content surface and it does not add an admin route, database migration, or second importer.

## Coverage

- 151 candidates across four vacation markets:
  - Portugal: 48 — Lisbon, Sintra/Cascais and Porto.
  - Greece: 44 — Athens, Rhodes and Thessaloniki.
  - Canada: 38 — Toronto and Montréal.
  - Argentina: 21 — Buenos Aires.
- Entity mix:
  - 9 vacation destination candidates.
  - 129 attractions, including 11 Jewish-heritage attractions.
  - 2 Where to stay neighborhood anchors.
  - 11 practical Jewish-travel resources. These are community or certifier resources, not restaurant or accommodation listings.

The attraction-led mix is deliberate. Attractions do not have to be Jewish places or kosher establishments — Jewish venues are welcome when they fit, and most rows are ordinary tourism landmarks suitable for Orthodox / Torah-observant travelers. Do not stage clubs, nightlife, mixed concerts, or similar. A named attraction can be supported by its official operator, tourism board, museum, municipal guide, or community source without making claims about food, hours, prices, availability, contacts, certification, or affiliate relationships. Individual food and accommodation listings were not added where a first-party source did not support a durable listing.

## Files

- `schema.ts` defines the portable candidate contract, source types, deterministic IDs and normalized duplicate keys.
- `sources.ts` is the first-party source registry. Resolved candidate objects retain `sourceUrl`, `sourceType`, attribution, evidence and date checked.
- `candidates.ts` exports `worldwideBatch2Candidates`.
- `baseline.ts` records the current core-content collision snapshot used to exclude already-covered entries.
- `validate.ts` validates the pack and prints its counts.

## Import contract

Every candidate resolves to these central-import-friendly fields:

- A stable external `id` and identical `sourceId`.
- A normalizable `name`, canonical aliases, keywords, locality, destination and country.
- `sourceUrl`, `sourceType`, source name, attribution, evidence and review date.
- `normalizedName`, `normalizedLocation` and a deterministic `dedupeKey`.
- An explicit `publicationReadiness` value and a non-empty `requiredBeforePublication` gate.

The planned centralized importer can stage all rows as `ContentImportCandidate` records with `status: NEEDS_REVIEW`:

- `vacation_destination` uses `importTarget: VacationDestination`. Its eventual adapter should require the normal destination editorial fields and derived readiness checks before it can be public.
- `attraction` uses `importKind: ATTRACTION` and `importTarget: Attraction`.
- `stay_anchor` uses `importKind: PLACE_TO_STAY` and `importTarget: KosherArea`. It must receive a primary-source coordinate and a customer-ready anchor note before materializing as a public Where to stay anchor.
- `kosher_travel_resource` uses `importKind: PRACTICAL` and `importTarget: PracticalPlace`. It must remain a resource record; do not coerce a community body or certifier into a kosher-food or accommodation listing.

No row is marked `PUBLISHED`. The validator rejects a pack row that attempts to bypass review, lacks source provenance, lacks aliases or keywords, has an unstable ID, has a stale/invalid duplicate key, collides within the pack, or collides with the captured core-content baseline.

## Representative source types

- Official tourism: [Visit Portugal — Lisbon](https://visitportugal.com/en/content/discovering-lisbon), [Visit Greece — Rhodes](https://www.visitgreece.gr/en/islands/Dodecanese/Rhodes), [Destination Toronto](https://www.destinationtoronto.com/things-to-do/attractions/must-see-attractions/), and [Tourisme Montréal](https://www.mtl.org/en/experience/musts-first-time-visitors).
- Official attraction and museum: [Parques de Sintra](https://www.parquesdesintra.pt/en/parks-monuments/), [Jewish Museum of Greece](https://jewishmuseum.gr/en/organise-your-visit/), and [Jewish Museum of Rhodes](https://jewishrhodes.org/jewish-museum-of-rhodes/).
- Official community or certifier: [Comunidade Israelita de Lisboa](https://cilisboa.org/), [Jewish Community of Oporto](https://comunidade-israelita-porto.org/about-us/), [KIS Greece](https://www.kis.gr/en), [COR](https://cor.ca/), [MK Kosher](https://mk.ca/), and [AMIA](https://www.amia.org.ar/home/).
- Official municipal: [Buenos Aires — Jewish Buenos Aires](https://turismo.buenosaires.gob.ar/en/article/jewish-buenos-aires).

Only source URLs and short provenance metadata are stored. No proprietary source text, images, contact details, pricing, opening hours, reviews, or booking claims are copied.

## Duplicate exclusions

`baseline.ts` captures all current vacation destinations plus selected-market core records that would collide. In particular, this pack intentionally excludes the existing Athens Acropolis, the existing Rhodes La Juderia/Kahal Shalom record, and the existing Athens Thiseio stay anchor. It also avoids London, France and Italy because current vacation data already covers those markets.

## Validation

Run from the repository root:

```bash
npx tsx data/imports/worldwide-batch-2/validate.ts
npx eslint "data/imports/worldwide-batch-2/**/*.ts"
git diff --check
```

The intended next international market is Madrid and Barcelona: both have strong vacation demand and enough official tourism, community and certifier research paths to create a similarly source-bounded pack after a fresh duplicate inventory.
