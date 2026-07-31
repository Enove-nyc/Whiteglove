# Roadmap

Two review scans, in one list, with what has actually been built marked as
such. Nothing here is marked done unless it is done and was checked.

Status words mean exactly this:

- **Done** — built, tested, merged.
- **Part** — some of it is built; the rest is named.
- **Blocked** — cannot start without a decision or a database migration.
- **Open** — not started.

---

## Scan 1 — public site review

| # | Item | Status | Where |
| --- | --- | --- | --- |
| 1 | Consolidate `/book` and `/booking` | **Done** | #145 |
| 2 | Real phone and tablet testing, fix breakpoints | **Done** | #147 · `npm run audit:ui` |
| 3 | Form labels, focus states, touch targets | **Done** | #147 |
| 4 | One destination schema and public template | **Part** | template already shared; the extra fields need the migration below |
| 5 | Completeness and verification workflow in the admin | **Done** | #149 |
| 6 | Finish Uman and the most-visited guides | **Blocked** | needs the migration below |
| 7 | Connect destination pages to routes and itineraries | **Done** | #150 |
| 8 | Unique metadata, canonicals, social cards, structured data | **Done** | #151 — **needs `NEXT_PUBLIC_SITE_URL` set** |
| 9 | Account verification, recovery, rate limiting | **Done** | #152 |
| 10 | Route optimization, saving, sharing, printing | **Part** | #153 — map preview and drag-and-drop still open |
| 11 | Directory filtering and large-list performance | **Done** | #154 |
| 12 | Provider verification and listing management | **Done** | a number is published only on consent or a public source of their own; a checked date and response time show when set; both admin screens can record consent. **Needs the migration run.** |
| 13 | Sponsored-content experience | **Open** | |
| 14 | Performance, accessibility and cross-browser QA | **Part** | audit script exists; Safari still needs a real device |

---

## Scan 2 — admin and Travel Command Center

The full text of this scan is the specification. What follows is its 27
sections with an honest status, so nothing is quietly assumed to be done.

### Already built, in whole or in part

| Section | Status | Note |
| --- | --- | --- |
| 9. Destination completion tracker | **Done** | admin work queue, 297 records sorted thinnest-first, per-record missing-field list. The public side shows words, never a percentage. |
| 13. Border crossings in the public planner | **Part** | crossings are detected and warned about, external-EU borders called out. **Not** yet folded into the calculated travel time, and there is no live wait-time data. |
| 14. Public intelligent route planner | **Part** | fixed start/end, optimisation between them, manual reordering, driving times, save, share, print. Missing: cost/fuel/tolls, avoid-tolls/ferries, along-the-route food and minyanim, PDF export. |
| 24. Security | **Part** | rate limiting on every account endpoint, one password rule, terms consent, the six-digit code never reaches the browser. Missing: admin 2FA, role-based permissions, audit history, backups. |
| 1. Responsive admin foundation | **Done** | `npm run audit:admin` — 17 screens at 320/375/390/768/1024/1280. No sideways scrolling, no table breaking out of its box, no unlabelled input, every control 44px. |
| 2. Simplified admin navigation | **Part** | sections and global "go to" search already existed. Added: breadcrumbs, a named back link, quick-add, recently visited. Still open: pinned sections, draft/published filters. |
| 3. Admin dashboard homepage | **Part** | content totals and quick-add actions added, on top of the alerts, work panels and completeness queue already there. Still open: broken links, missing images, expired ads, API health, popular destinations/routes. |
| Map (owner request, not in either scan) | **Done** | opens on everything the site holds — 287 places — instead of Kraków at 50 km. Things to do and places to stay added alongside kevarim, kosher food and airports. Counts per category for whatever area you are looking at. Markers are the logo's eight-point compass rose, shrinking at continent zoom so three hundred of them stay separable. **Open:** clustering, so a hundred places in one region become one pin with a number. |
| 4. Complete destination manager | **Part** | thirteen sections instead of seven — Tefillos, Shabbos, hospital, emergency, kosher shops and parking now exist end to end, from one shared list that the editor, the completeness tracker and the public page all read. Each listing carries how far it has been checked, when, and where it came from. **Still open:** photos (the table exists; §7 is the library), and the completeness tracker still reads the built-in record rather than the database, so the eight new sections count as missing rather than being answerable. |
| 8. Suggest-an-edit workflow | **Done** | Review side: a queue ordered oldest-waiting-first, filters by answer, a required reason for turning down or asking for more, append-only history, a link to the page it is about, and a reply draft the owner sends. **Directory submissions arrive on the same form the owner has**, field by field; the review shows only what would change and Accept writes the listing. Corrections to other kinds of content still arrive as prose. |

### Not started

| Section | Note |
| --- | --- |

| 5. Cemetery and tzaddik management | Records exist; the separate reusable tzaddik record does not. |
| 6. Searchable forms and address autocomplete | `AddressAutocomplete` and `AirportAutocomplete` exist and could be generalised. |
| 7. Rich media library | |
| 10. Flight and airport management | Metropolitan airport groups are the substantive part. |
| 11. Route planner management (admin) | |
| 12. Border crossing management (admin) | The public warnings are hardcoded rules; this is the data behind them. |
| 15. Personal Travel Command Center | |
| 16. Command Center alerts | |
| 17. Travel documents and confirmations | **Scoped down by decision: no passport or identity-document storage.** Per-trip notes are built (below); confirmations and PDFs are still open. |
| 18. User and permission management | |
| 19. Advertisement manager | Partly present: promotions exist with placements and tracking. |
| 20. API management | |
| 21. Analytics dashboard | Some analytics already recorded. |
| 22. Reports and maintenance | The completeness queue is the first of these reports. |
| 23. Publishing workflow | `ContentStatus` already has DRAFT / PUBLISHED / NEEDS_REVIEW. No revisions, autosave or scheduling. |
| 25. Website settings | Partly present. |
| 26. AI admin tools | Deliberately last. |

---

## The migration — written, not yet run

The schema can now hold everything the items above were waiting for. The
migrations are on record and were checked against a real PostgreSQL 16; see
**[docs/migrations.md](./migrations.md)** for what they do and how to apply
them.

- Six new `PlaceCategory` values — `TEFILLOS`, `SHABBOS`, `HOSPITAL`,
  `EMERGENCY`, `GROCERY`, `PARKING`. In their own migration, because
  `ALTER TYPE … ADD VALUE` is the one statement here that is not ordinary.
- Verification status and date on `Destination`, `Cemetery`, `PracticalPlace`
  and `DirectoryProvider`; `sources` on `Destination`.
- Consent to publish a personal phone number on `DirectoryProvider` —
  `contactConsent`, defaulting to **false**, with when and how it was given.
- A `Photo` table, with credit and source, draft by default.
- A catch-up migration for four tables that had been added to the schema
  without one: `DirectoryProvider`, `Attraction`, `KosherStay`, `KosherArea`.

**Still to do: run it.** `npm run db:migrate`, after one `prisma migrate
resolve --applied 0_init`. Until it runs, the columns exist in the schema and
not in the database.

**Also still to do: use it.** This migration only makes room. Reading and
writing the new fields — the destination manager (§4), the provider consent
flags (scan 1 item 12), the photo library (§7) — is the next piece of work,
and `lib/verification.ts` still counts Tefillos, Shabbos, Hospital, Emergency
and Photos as untracked because the *record type it reads* has not changed yet.

---

## Known: how long an edit takes to appear

Three different answers, now one. `/directory`, `/attractions`, `/kosher-stays`
and `/map` render per request. The destination, city-guide and cemetery pages
rebuild at most once a minute — measured, not assumed: with a sixty-second
window an edit made after the build does appear.

It used to be an hour on those three, while the admin promised "changes go
live within a minute". Wrong by a factor of sixty, and the shape of a bug
report that reads "the editor does not work".

The difference between the two groups is real and worth remembering: a page
whose reads are `cache: "no-store"` fetches is NOT refreshed by `revalidate`
and needs `force-dynamic`; a page reading through Prisma is.

---

## Known: pages that were frozen at build time

`/directory`, `/attractions`, `/kosher-stays` and `/map` all read content the
owner adds in the admin, and all four were prerendered once per deploy. A
listing added on Tuesday was still absent on Friday — the admin saved it, the
store held it, and the page kept serving the snapshot taken at build. All four
now render per request.

`revalidate = 60` was tried first and measured: the page still never re-read
the store, because those reads are `cache: "no-store"` fetches that a prerender
does not re-run. Worth remembering before adding another owner-edited page —
the mode has to be `force-dynamic`, the same as `/stops` and the admin.

---

## Known: values written into the request address

Several stores save by putting the whole value in the URL —
`set/<key>/<the entire encoded contents>` — instead of in the request body. No
HTTP server accepts an address of any size, so past a certain point the write
simply fails and the screen reports "connect the private database" as though
nothing were configured.

`lib/admin-content.ts` was fixed here because it was already past that point:
with the locations seeded, its save address measured **312,079 characters**, so
nothing in the content manager — settings, locations, accommodations,
suggestions — could ever have saved. It now sends the value in the body, the
same as `lib/hechsher-store.ts`, `lib/media.ts` and `lib/directory-store.ts`
already do.

Still on the old pattern, and small only for now:

- `lib/email-log.ts` — no cap at all, so it grows until it stops saving.
- `lib/expenses.ts` (line 58) — capped at 10,000 items, which is far past the
  point an address stops working.
- `lib/account-store.ts`, `lib/admin-inventory.ts`, `lib/access-passwords.ts` —
  capped or naturally small today.

Each is a two-line change of the same shape. They are listed rather than done
so that this stays reviewable.

---

## Things that need a decision, not code

- ~~**`NEXT_PUBLIC_SITE_URL` is unset.**~~ — **set by the owner.** Because it
  is resolved at BUILD time for prerendered pages, the next deploy has to be
  without the build cache for canonicals and share images to pick it up.
- ~~**Two domains serve the same site.**~~ — **decided.** Everything is
  `whitegloveitineraries.com`; `enovenyc.com` is a different business and only
  redirects here. The terms and privacy pages named the wrong one and now name
  the right one, from a single constant. Still worth confirming the redirect
  is a 301 at the DNS/host level so a search engine folds the two together.
- ~~**What "Featured" means in the provider directory.**~~ — **decided.** Two
  reasons, recorded per listing in the admin: service found consistently good,
  or sponsored placement. The badge is the same for both and a visitor is not
  told which applies to a given listing. The disclosure does say that some
  featured listings are sponsored — a badge that may mean "they paid" and is
  indistinguishable from an editorial pick is the specific thing the FTC, the
  ASA and EU consumer law are written to catch, so the possibility is stated
  even though the individual listing is not named. If one is ever genuinely
  paid for, a marker on that one is safer still.
- ~~**Account enumeration on password reset.**~~ — **decided: closed.** The
  endpoint now answers identically whether or not the account exists. A
  mistyped address is no longer told it was mistyped, which is the agreed
  cost: telling a typo apart from an unknown address IS the leak.
- ~~**Storing passport copies**~~ — **decided: no.** The site does not store
  passport copies or identity documents. Per-trip notes exist instead, for the
  things a traveler wants to remember, and the field says plainly that notes
  travel with the trip and are not the place for anything private.
