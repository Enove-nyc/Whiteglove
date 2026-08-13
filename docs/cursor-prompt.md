# Prompt for Cursor — everything still undone on White Glove Itineraries

Paste everything below the line into Cursor.

---

You are working on **White Glove Itineraries**, a Next.js + Prisma travel site
(kosher/heritage travel discovery, booking referral, and an admin back office).

**Read `AGENTS.md` at the repo root before writing any line of code.** It is
binding: it governs customer-facing voice, the naming table, the audience
standard, and a list of settled decisions. Also read the relevant guide under
`node_modules/next/dist/docs/` — this Next.js version has breaking changes
against what you may remember.

## Rules for this whole job

- Work one item at a time. Each item ends with: `npm run lint`, `tsc --noEmit`,
  `npm test`, `npm run audit:ui`, `npm run audit:destinations`, and a production
  build. Do not batch ten items into one commit.
- **Never invent content.** No price, no availability, no review, no opening
  hours, no partner, no traffic figure, no coordinate nobody has stood at. Where
  data is missing, the slot stays empty and hidden — the site's whole argument is
  that what it prints has been checked.
- Every fallback must be **legible, not silent**. The recurring bug class in this
  codebase is a read that quietly returns built-in sample data as though it were
  the owner's own. Say where data came from.
- Fail open on anything that would cost a visitor their submission or their trip.
  Store first, notify second, never await the notify.
- When you add a guard, add the **test that would have caught the bug**, and
  prove it fails against the old code.

## Do NOT touch these — they are settled, not gaps

1. **Pricing for the done-for-you planning service.** No starting price, range,
   turnaround, refund terms, or post-itinerary support window. Do not build a
   page that would need one. `/services` stays the bottom option, never promoted.
2. **The About page carries no personal facts** — no name, background, photo,
   years of experience, or location. The empty fields on `/admin/settings/about`
   are finished, not unfilled.
3. **The site notice stays a full-screen modal.** The cost (it blocks automated
   functional checks and is the whole of the tab-order findings) is known and
   accepted. Do not convert it to a strip.
4. **Vacation attractions need not be Jewish or kosher.** Audience-appropriate ≠
   kosher-only. No nightlife/clubs/bars/casinos/mixed concerts. Reserve "kosher"
   for food and kashrus. Public wording lives in `data/listing-audience.ts` —
   reuse it, do not write a second version.
5. `docs/launch-checklist.md`'s pricing and About rows, and
   `docs/page-inventory.md`'s "Real user accounts" row, are **stale** — accounts
   exist and the rest is settled above. Ignore them.

---

# The work

## A. Commercial — Phase 3 and Phase 4 of `docs/commercial-pivot-plan.md`

Phases 1 and 2 are complete and live, except one gap. Read that doc's §4, §6 and
§10 before starting.

1. **Products with no programme joined.** `TravelExtras` renders slots for
   transfers, activities, insurance, eSIM and seasonal programmes, and
   `routeFor` returns `none` for all of them, so nothing is offered. Make each
   one configurable from `/admin/settings/travel-essentials` the same way the
   existing rows are, and keep the "this link earns nothing" state visible in
   the admin rather than hidden.
2. **Phase 3 — advertising.** `/advertise` page; advertiser and campaign
   entities; Draft → Preview → Publish; sponsored labels on every placement;
   advertiser-facing reporting. The wall in §4 is mandatory:
   `lib/verification.ts` and `lib/trust-status.ts` must have **no import path**
   from any advertising module — a listing can buy a label, never a status. Add
   a test that fails on such an import.
3. **Phase 3 — the directory becomes a curated partner network** (see §8's "the
   provider directory — a real finding").
4. **Phase 4** — seasonal collections; indexable commercial collection pages;
   email capture and follow-ups; destination expansion against the existing
   publication bar in `lib/destination-readiness.ts`.
5. **Commission disclosure under `/book`.** Its three searches currently show a
   disclosure only because the Travel Essentials block happens to be filled.
   Empty that block and three earning searches carry none. Make the disclosure
   unconditional.

## B. Vacation destinations — `docs/vacation-expansion.md`

The unit of work is **evidence, not prose**: gather eateries, walkable quarters
with published shul coordinates, stays with their kashrus claim **and season**,
and attractions — then the destination record is twenty minutes on top.

Publish in this order, each only when it clears all five checks in
`lib/destination-readiness.ts`: New York getaways (Catskills, Hudson Valley) →
Los Angeles → Israel beyond Jerusalem → Caribbean and Mexico → Mediterranean
beaches → winter/ski → seasonal programmes → domestic weekends.

- A `kosherStay` must never be recorded without its `season`. A blank season
  reads as year-round and lands a family at a summer kitchen in November.
- `ski` and `seasonal-programme` are not added to `TRIP_THEMES` until three
  destinations sit behind each (`NEW_THEME_THRESHOLD`).
- `jungfrau-region` is a named exception in `tests/vacation-pipeline.test.ts`; it
  comes off that list the day a stay in Interlaken, Grindelwald or Wengen is on
  record.
- A candidate that turns out to have too little behind it **stays in the
  queue** — that is a successful research outcome, not a failure.

## C. Editable pages — `docs/pages-migration.md`

The block editor plan is written and not built. Follow it exactly, including the
additive rule: hard-coded content stays in the repo as the page's **default**,
the database holds an **override**, and a page renders its override only when
one is published. Order of work: block model + renderer + fail-safe read layer →
admin page list → block editor with previews → convert pages a few at a time,
verifying each renders identically before and after. Schema change is one
nullable `blocks Json?` column on `Page`. Steps 1–3 first; step 4 can stop at any
point without leaving anything half-done.

## D. Planner and trips — the "still open" tails in `docs/roadmap.md`

- **Route planner (§14):** cost/fuel/tolls, avoid-tolls/avoid-ferries, food and
  minyanim along the route, PDF export. Also map preview and drag-and-drop
  reordering (scan 1, item 10).
- **Border crossings (§12):** which crossing a route should actually be sent
  through, and the same freshness treatment for travel advisories. Live wait-time
  data from anyone but the owner is still open (§13).
- **Location access** so the phone can notice a border was cleared without being
  asked (`lib/day-progress.ts`).
- **Trip countdown strip** is missing from the shared and printed views.
- **Sharing:** an editor currently opens the trip through the read-only shared
  view instead of the planner, and nobody but the owner is notified.
- **Travel documents (§17):** offline access on the day.
- **Suggest-a-place:** offer the same "send this in?" prompt for trips built
  before the feature existed, not only at the moment a stop is added.
- **Command centre (§15/§16):** dates and documents; anything that *pushes*
  (email or notification) rather than waiting to be opened; a trip-level roll-up
  of travel advisories.
- **Unsaved-draft rescue (§23):** extend it to the page editor and the itinerary
  editor.
- **Recycle bin:** undo for an edit, as opposed to a deletion.
- **Edit history (§23/24):** scheduling a change for a date, and history beyond
  30 days.

## E. Admin

- **§2 navigation:** pinned sections, draft/published filters.
- **§3 dashboard:** broken links, missing images, expired ads, API health,
  popular destinations and routes.
- **§19 adverts:** what an advertiser is owed, a rate over time rather than
  since-forever, A/B.
- **§18 permissions / §24 security:** admin 2FA, backups, and narrowing the API
  keys per-area the way admin areas are already narrowed.
- **§5 kevarim:** a reusable tzaddik record in the admin, and support for a
  person buried in more than one recorded place.
- **§7 media:** photo reordering, and a shared library rather than per-owner
  uploads.
- **§21/22 reports:** visits over time rather than since-forever, per-country and
  per-referrer breakdowns, and an export.
- **§23 publishing:** revisions, autosave and scheduling (`ContentStatus` already
  has DRAFT / PUBLISHED / NEEDS_REVIEW).
- **§13 sponsored-content experience** (scan 1, item 13) — not started.
- **Map:** clustering, so a hundred places in one region become one pin with a
  number.
- **§26 AI admin tools** — deliberately last. Do not start it.

## F. Correctness and infrastructure

1. **Stores that write the whole value into the request URL.** Fix these the way
   `lib/admin-content.ts` was fixed — send the value in the body. Same two-line
   shape each:
   - `lib/email-log.ts` — no cap at all, so it grows until writes silently fail.
   - `lib/expenses.ts` (~line 58) — capped at 10,000 items, far past the point a
     URL stops working.
   - `lib/account-store.ts`, `lib/admin-inventory.ts`, `lib/access-passwords.ts`
     — capped or naturally small today, but same pattern.
2. **The migration is written and not fully used.** `docs/migrations.md` has the
   detail. Reading and writing the new fields is the outstanding half: the
   destination manager (§4), the provider consent flags (scan 1 item 12), and
   the photo library (§7). `lib/verification.ts` still counts Tefillos, Shabbos,
   Hospital, Emergency and Photos as untracked because the record type it reads
   has not changed. Finishing this also unblocks Uman and the most-visited
   guides (scan 1 item 6) and the one-destination-schema work (item 4).
3. **Any new owner-edited public page must be `force-dynamic`**, not
   `revalidate`. Reads that are `cache: "no-store"` fetches are not re-run by a
   prerender — this is exactly how `/directory`, `/attractions`, `/kosher-stays`
   and `/map` came to be frozen at build time.
4. **Safari on a real device** is still unverified (scan 1, item 14).
5. **Encoding artifacts** — `docs/page-inventory.md` reports visible mojibake and
   misencoded Yiddish/Hebrew in source files. Repair before further content work.
   Respect `tests/yiddish-labels.test.ts`: a Yiddish label is an allowlisted,
   deliberate act, and an English word in Hebrew letters is not a translation.
6. **Verification dates.** Kosher places, seasonal programmes, minyanim, access
   contacts and borders all render a last-checked date and no record carries one.
   The display is ready; the data entry path is the work.

---

When you finish an item, say what changed and what it cost — in prose, not a
checklist.
