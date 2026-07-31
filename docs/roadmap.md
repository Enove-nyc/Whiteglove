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
| 4. Complete destination manager | **Part** | thirteen sections instead of seven — Tefillos, Shabbos, hospital, emergency, kosher shops and parking now exist end to end, from one shared list that the editor, the completeness tracker and the public page all read. Each listing carries how far it has been checked, when, and where it came from. The completeness tracker now counts what is in the database, so entering a hospital or a Shabbos note actually moves the number — a seeded town went 33% → 58%, with nothing left unanswerable. Photos can be uploaded (§7). |
| 7. Rich media library | **Part** | pictures at all three levels a traveler asks about — the **town**, the **beis hachaim**, and **one listing** (this hotel, this shul, this mikvah). Uploaded, captioned, credited and published from the admin; on the page with the credit under them. A picture with no credit is saved as a draft and says so, enforced on the server as well as the screen. A built-in beis hachaim needs no database row first — the first picture creates it, the way a shomer's number does. Removing a listing removes its pictures and nothing else. **Visitors can send one in, and the owner confirms** — that is the whole workflow, per his decision: the public endpoint can only ever write a draft, and the one screen that can publish is his. A submission has to name whose photograph it is AND separately confirm the sender may share it, because those are two different questions. Five pictures an hour per address, counted on storing rather than on trying, so a mistyped email does not lock somebody out. **Still open:** reordering, and a shared library rather than per-owner uploads. |
| 15. Personal Travel Command Center | **Part** | `/command-center` — a signed-in traveller's trip, stop by stop, arranged as what to DO in the week before they go: the numbers worth having in their phone, then the stops that need something, then the rest. A beis hachaim stop is judged against its own record, so "nobody on file to let you in" and "the exact grave has not been checked" are real answers rather than a blank. Deliberately quiet: only what can stop the visit happening earns a line, because a list that says everything is a list nobody reads. **Still open:** dates and documents, alerts (§16), anything that pushes rather than waits to be opened. |
| 5. Cemetery and tzaddik management | **Part** | every tzadik has a page — `/tzaddikim/[person]` — with his seforim, his yahrzeit, who else is buried there, and how to reach the kever. Press a name on a beis hachaim page and you are on it. The record is still the cemetery's, read from the other end, so a correction in the admin shows on both. 327 people, addressed by name and disambiguated by town only where two really share one. **Still open:** the reusable tzaddik record in the admin, and a person buried in more than one recorded place. |
| 16. Command Center alerts | **Part** | the trip says two things without being asked, at the top of the command centre. **Shabbos first** — a stop planned for Shabbos, or on erev Shabbos with the local candle-lighting time worked out from that stop's own coordinates (lib/shabbos.ts already did the sunset arithmetic; this calls it per stop). It leads not because it is likeliest but because finding out late is a different order of problem: a missing shomer number costs a morning, a kever visit planned for Shabbos makes somebody choose between the plan and the day. Then **leaving soon with something unresolved**, urgent inside a fortnight and quiet beyond it. A trip with no dates says so plainly, because silence there reads as "no problems" when it means "nothing was checked". **Still open:** anything that pushes — email or a notification — and a trip-level roll-up of the travel advisories (they already show per country). |
| 19. Advertisement manager | **Part** | the data was always rich — advertiser, placements, devices, paths, dates, priority, views, clicks. What was missing was the management: every advert read as "enabled" whether or not it was running, and its numbers claimed things they could not support. Each now carries **where it stands** (on the site now / starts later / finished / paused / not placed anywhere — "not placed" beats the dates, because an advert with nowhere to appear cannot be live whatever they say) and **a rate it is entitled to**: below a hundred views it says "3 from 12 — too few to tell yet" rather than 25%, which sounds excellent and means nothing. The list is ordered by what needs doing, and the dashboard names the worst one. Deleting an advert works (#178) — it never had a server branch at all. **Still open:** what an advertiser is owed, a rate over time rather than since forever, and A/B. |
| 18. User and permission management | **Part** | the admin knew nothing about who was in it: one shared password, one shared cookie, identical for everybody who has ever held it. That also made the team screen's grant untrue — marking somebody an administrator put a link to the admin on their account page, and the middleware bounced them to a password prompt they had never been given the password for. **A named administrator can now open the admin as themselves**, from their own account, and the session carries who: the header names them and the sign-in log records "admin account" with the email instead of "admin code" for every person alive. The name cookie is signed, so holding the shared password does not let anybody relabel themselves as the owner. The shared password still works and is labelled as what it is — nobody in particular. **Still open, and now possible:** per-area permissions, which needed an identity to attach to. |
| 8. Suggest-an-edit workflow | **Done** | Review side: a queue ordered oldest-waiting-first, filters by answer, a required reason for turning down or asking for more, append-only history, a link to the page it is about, and a reply draft the owner sends. **Directory submissions arrive on the same form the owner has**, field by field; the review shows only what would change and Accept writes the listing. Corrections to other kinds of content still arrive as prose. |

### Not started

| Section | Note |
| --- | --- |


| 6. Searchable forms and address autocomplete | `AddressAutocomplete` and `AirportAutocomplete` exist and could be generalised. |
| 10. Flight and airport management | Metropolitan airport groups are the substantive part. |
| 11. Route planner management (admin) | |
| 12. Border crossing management (admin) | The public warnings are hardcoded rules; this is the data behind them. |


| 17. Travel documents and confirmations | **Scoped down by decision: no passport or identity-document storage.** Per-trip notes are built (below); confirmations and PDFs are still open. |


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

**Two ways to run it.** In the admin: Towns → "Set up database & import
destinations", which now brings an older database up to date as well as
creating a new one — checked against a real PostgreSQL 16 from empty, from an
April-era database, and pressed twice, all three landing exactly on the schema.
Or `npm run db:migrate` in a terminal, after one `prisma migrate resolve
--applied 0_init`; that is still the record, and the only one that writes the
migration bookkeeping.

**Also still to do: use it.** This migration only makes room. Reading and
writing the new fields — the destination manager (§4), the provider consent
flags (scan 1 item 12), the photo library (§7) — is the next piece of work,
and `lib/verification.ts` still counts Tefillos, Shabbos, Hospital, Emergency
and Photos as untracked because the *record type it reads* has not changed yet.

---

## Known: one missing table used to erase everything the owner typed

The cemetery page read a beis hachaim and its pictures in a single query. On a
database where the migration had not been run the `Photo` table did not exist,
so that query threw, the catch above it fell back to the built-in record, and
**every kever the owner had added disappeared from the page**. He had saved
them. The admin had said "Saved." They were in the database. The page would
not read them, and nothing anywhere said why.

The town pages were worse: `getPublishedDestinationContent` returned null, so
every listing and every phone number vanished at once and the page fell back to
the built-in content — which looks exactly like a site nobody has entered
anything into. The database import failed for the same reason, on
`destination.createMany`.

The mistake was not the missing migration. It was joining something new and
optional onto something old and essential, so a failure in the new part cost
the old part everything. `lib/db-optional.ts` is the rule now: read the
essential thing on its own, read the new thing separately, and carry on without
it when it fails — saying so in the log, and naming the migration when that is
what it looks like.

---

## Yiddish: a real word, or English

A dozen labels carried a "Yiddish" heading that was an English word spelled
in Hebrew letters — טראַנספארט for transport, דרייווערס for drivers,
דירעקטאָרי for directory, סערוויסעס for services, טור־אָפּעראַטאָרן for tour
operators. To somebody who reads Yiddish that is not a translation; it is the
English word made harder to read, and it says the site cannot tell the
difference. They are gone.

A second pass removed four more the owner marked as not natural — רײַזע פֿירער,
וואו צו גיין, וואו צו שלאפן, פֿאַרבינדונג. Being made of real Yiddish words is
not the same as being what anybody would say, and that is not a distinction
this codebase can make for itself.

What is left is what people say: כשרות עסן, מנינים, מקוה, אכסניא, בתי החיים,
היים, נסיעות, כשר עסן, and — from the owner — תפילות, שבת, כשר. Place names
and names of tzaddikim are untouched; those were never the problem.

**Hospital, emergency, parking and the four provider categories have no
natural Yiddish**, per the owner. They stay English, and that is the right
answer for them rather than a gap waiting to be filled.

A section with no Yiddish word shows English alone. `tests/yiddish-labels.test.ts`
holds an allowlist, so adding a Yiddish label is a deliberate act rather than
something that creeps back in.

Nothing further is wanted here — the owner has answered, and the answer for
most of them is "there isn't one".

---

## Known: what cannot be made to look like the site

Two browser controls draw part of themselves and will not be styled:

- **A `<select>`'s open list.** The closed control is the site's — cream,
  navy, a gold chevron. The list that drops down is drawn by the operating
  system and no CSS reaches it, in any browser. The only way to change it is
  to stop using `<select>` and build a listbox, which means re-implementing
  keyboard handling, screen-reader announcements and the phone's native
  wheel picker. Not worth it for a menu of four options; possibly worth it if
  a dropdown ever becomes something people stare at.
- **A `<input type="date">`'s calendar popup.** Same problem, solved: on
  anything with a pointer the site draws its own calendar over the top
  (`components/DateField.tsx`), and on a touch screen the native one is left
  alone, because a hand-drawn popover loses to the one built into the phone
  when you are choosing with a thumb.

`components/BookingSearch.tsx` keeps its own date field on purpose: it masks
to MM/DD/YYYY for the partner search forms, and changing the value format
could break an integration that cannot be tested from here.

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
- ~~**Whether visitors may send in a picture.**~~ — **decided: yes, with the
  owner confirming every one.** Nothing a stranger sends reaches a page by
  itself: the public endpoint can only write a draft, and the only screen that
  can publish is the owner's. The form asks two separate questions — whose
  photograph it is, and whether the sender may share it — because somebody can
  honestly name a photographer and still have no right to hand the picture
  over, and that is most of how a photograph ends up published without
  permission.
- ~~**Storing passport copies**~~ — **decided: no.** The site does not store
  passport copies or identity documents. Per-trip notes exist instead, for the
  things a traveler wants to remember, and the field says plainly that notes
  travel with the trip and are not the place for anything private.
