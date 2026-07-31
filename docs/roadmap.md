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
| 12 | Provider verification and listing management | **Part** | this PR — verified badge and consent flags need the migration |
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
| 8. Suggest-an-edit workflow | **Done** | the submission side already existed; the review side now has a queue ordered oldest-waiting-first, filters by answer, a required reason for turning down or asking for more, editing the wording before accepting (the visitor's own words are kept), append-only history, a link to the page it is about and to the section that can fix it, and a reply draft the owner sends. |

### Not started

| Section | Note |
| --- | --- |

| 4. Complete destination manager | Depends on the migration below — most of the listed fields have nowhere to live. |
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

## The migration everything is waiting on

Several items above cannot start until the content database can hold the
fields they are about. Two changes are needed:

1. **New `PlaceCategory` values** — `TEFILLOS`, `SHABBOS`, `HOSPITAL`,
   `EMERGENCY`, `GROCERY`, `PARKING`. This is `ALTER TYPE … ADD VALUE` on a
   live Postgres enum.
2. **New columns** on `Destination`, `DirectoryProvider` and a new `Tzaddik`
   table — photos, sources, verification status and date, consent flags for
   publishing a personal phone number, service response times.

Adding columns is routine. Adding enum values is not reversible in the same
transaction and wants reviewing before it runs against live data. It has not
been written yet, and when it is it should be reviewed on its own rather than
inside a feature PR.

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

- **`NEXT_PUBLIC_SITE_URL` is unset.** Guides and cemetery pages resolve their
  canonical URL and share image at build time, so every build without it ships
  a relative canonical and an `og:image` pointing at localhost. One setting,
  then a redeploy without the build cache.
- **Two domains serve the same site.** `whitegloveitineraries.com` and
  `enovenyc.com` are both aliased to production, and the terms and privacy
  pages name `enovenyc.com` while everything else names the other. A search
  engine is seeing two copies of every page.
- **What "Featured" means in the provider directory.** The badge always
  carries a disclosure; the default one makes no claim about payment either
  way, which is safe but says less than it could. Set
  `DIRECTORY_FEATURED_NOTE` to the real answer — paid placement, or an
  editorial choice — once it is decided. If nobody pays, saying so is a trust
  asset worth having.
- **Account enumeration on password reset.** It answers differently for a
  known and an unknown address. Closing that costs a typo'd address any
  feedback that it was a typo.
- ~~**Storing passport copies**~~ — **decided: no.** The site does not store
  passport copies or identity documents. Per-trip notes exist instead, for the
  things a traveler wants to remember, and the field says plainly that notes
  travel with the trip and are not the place for anything private.
