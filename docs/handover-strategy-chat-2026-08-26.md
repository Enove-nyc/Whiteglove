# Handover from the strategy chat — filed 26 August 2026

Open work carried over from another session, kept as it was written, under the
corrections it needs to be safe to act on.

## Checked before filing

`npx eslint .` on `main` today: **50 errors, 25 warnings**. The note's headline
figure is exact, which is worth saying, because the next two claims are not.

### The separate-codebase claim is now wrong, and acting on it would be unsafe

The note says:

> whitegloveitineraries.com is a SEPARATE deployment from a SEPARATE codebase.
> Nothing built in this repo reaches it.

Half right, and the wrong half matters. The codebases are separate — it is
`Enove-nyc/Whiteglove-Itineraries`, a fork, and a change here does not reach it.
**The DATA is not separate.** The owner confirmed on 26 August that
`UPSTASH_REDIS_REST_URL` is set to the same value on both Railway services, so
the two deployments read and write one store: the same listings, the same site
words, the same accounts, the same admin records.

What follows from that, and what a session acting on the old wording would get
wrong:

- A change to stored data from either admin is a change to both sites.
- The two admins were two doors onto one room. The itineraries one has now been
  shut (Whiteglove-Itineraries#18), because that deployment has no second
  factor and was therefore a way past the one on this side.
- "Do not link this site to a path that only exists there" still holds, and for
  the same reason as before — the ROUTES are separate even though the data is
  not.

### The lint note's worked example has moved

It points at `components/useSiteBrand.ts` as the model fix. That file is not in
this repo on `main` today; the same `useSyncExternalStore` treatment now lives
in `components/Navbar.tsx` and `components/Footer.tsx`, where the brand is read
with a server snapshot instead of corrected in an effect. Read those instead.

### One of its files is now first in the queue for a different reason

`components/CaseStudiesForm.tsx` carries one of the same
`react-hooks/set-state-in-effect` errors, and it was deliberately left alone on
26 August while its mobile layout was fixed: the effect closes the dialog after
a save, and that path can only be exercised against a live store. Whoever takes
the lint batch should know it was seen and skipped on purpose, not missed.

---

# White Glove Kosher Travel — open work handed over from a previous chat

## REPO / DEPLOY

- Repo: Enove-nyc/Whiteglove. Work on branch claude/white-glove-strategy-ayxhcr,
  merged to main. Railway auto-deploys main to www.whiteglovekoshertravel.com.
- whitegloveitineraries.com is a SEPARATE deployment from a SEPARATE codebase.
  Nothing built in this repo reaches it. Do not link this site to a path that
  only exists there. *(See the correction above: the codebases are separate,
  the private store is not.)*
- Read AGENTS.md first — it carries settled decisions that must not be re-opened.
- Verification loop used throughout, please keep it:
  `npx tsc --noEmit` → `npx eslint <changed files>` → `npx tsx --test tests/<file>`
  → `npm test` → `timeout 500 npx next build` → commit → merge to main → verify live.
- Current state at handover: 4509/4509 tests pass, typecheck clean, build green.

## OPEN ITEM 1 — 50 lint errors, 25 warnings across the repo

`npx eslint .` fails on 29 files. 41 of the 50 errors are the SAME rule:
`react-hooks/set-state-in-effect` (a synchronous setState inside useEffect).

Worst files: `components/companion/CompanionApp.tsx` (8), `ItineraryBuilder.tsx`
(5), `LibraryManager.tsx` (4), then `AddressAutocomplete`, `AirportAdmin`,
`ClientFormBuilder`, `KeverEditor`, `ShomerEditor`, `TeamEditor` (2 each).

Others: 3 `react/no-unescaped-entities`, 2 `react-hooks/refs`, 2
`@typescript-eslint/no-require-imports` (`scripts/generate-editorial-packs.cjs`),
1 `react-hooks/immutability`, 1 `prefer-const`.

A worked example of the right fix is `components/useSiteBrand.ts` — the Footer
had this exact error and was fixed by reading the value through
`useSyncExternalStore` with a server snapshot instead of correcting itself in an
effect. Not every case is that shape; some are genuinely derived state that
should be computed during render instead.

Do these in small batches with the full test suite between, not in one sweep.

## OPEN ITEM 2 — six partner hand-off checks never run in a browser

`scripts/audit-flows.mjs` (`npm run audit:flows`) drives the real booking
journeys. Six checks that hand off to stay22 / tp.media / travelpayouts /
emrldco cannot run in the Claude sandbox: curl reaches those hosts through the
proxy, but Chromium launched with that proxy gets `ERR_CONNECTION_RESET` on
every external host including example.com. They SKIP rather than fail, and the
script header explains why.

The hand-off URLs themselves were verified another way: through the site's own
`/go` route against a local production build — hotel → booking.com (202),
flight → aviasales.com (200), car → kayak.com (200).

What is still needed: one run of `npm run audit:flows` from a machine whose
browser has ordinary internet, ideally against the live site, before launch.

## OPEN ITEM 3 — searching "flights" alone

`/api/search?q=flights` returns "Search booking partners" and "Travel
Essentials" correctly, but "Hechsherim" still appears THIRD, because the
hechsherim page indexes a certifier called "Heights" and flights→heights is 2
edits.

Cosmetic and deliberately left: tightening `lib/site-search-match.ts`'s
`maxEditsFor` any further breaks the Yiddish bridge (בארדיאב sounds out to
"bardiab" against an indexed "bardiov", 2 edits apart, neither spelling wrong).
`tests/search-wrong-answer.test.ts` pins both sides. Only attempt this with a
smarter approach than a global edit budget.

## OPEN ITEM 4 — audit priorities never started (product decisions, not bugs)

From the owner's 30-priority site audit, these were never begun and need HIS
decision on scope before any work: Trip Mode, split payments, change history,
team features, adviser command centre, inbox quick actions, wallet expansion,
map↔list view, contextual AI, search command centre, mobile bottom navigation,
destination-page simplification, the admin "Needs Review" screen (priority 2),
and the Data Health dashboard (priority 29).

Do not start these unprompted. Ask which one he wants and what it should do.

## DEFERRED AT THE OWNER'S WORD — do not build without him asking

- Agency tier (Advisor Pro + $25/mo per extra advisor seat, multi-login).
- Custom domains / white-label.
- `/services` or ANY personal trip-planning or booking-assistance offer. Removed
  outright. Never ask him to price it.
- Gear links on any surface beyond `/travel-gear` and `/packing`. He turned this
  down explicitly: a site that pushes gear everywhere looks like a gear site.

## ALREADY INVESTIGATED AND DELIBERATELY NOT DONE — do not redo

Three pages were measured and judged not worth converting to server-side
search, unlike `/kosher`, `/things-to-do` and `/cemeteries` which were:

- `/map` — 102KB gzip, but it plots 3,016 real points (1,952 of them located
  cemeteries). A map needs its points. Viewport loading is a feature change.
- `/hotels` — only 41 stay records (45KB JSON). Converting buys a few KB and
  adds network failure modes.
- `/tzaddikim` — 370 cards, 68KB gzip, and the payload buys an instant search
  across seforim and names plus country grouping and jump links.

## FOR CONTEXT — what was completed and is live

Search fixes (fuzzy budget, London/NY/etc mikvaos indexed); server-side search
for `/kosher` (206→19KB), `/things-to-do` (183→27KB) and `/cemeteries`
(92→17KB); broken `/things-to-do#slug` anchors fixed (links from `/stops` and
the planner to any entry past the first 24 used to land on a page that did not
contain it); canonical URLs; junk kosher listings; 5 phone numbers moved out of
address fields; public `/pricing`; Directory rename; Suggest-edit icon; Shabbos
Mode; Near my hotel; Friday candle-lighting warnings; the client app's Today
screen; `/login` opening on log in; `/packing` opened to everyone with a starter
list; journey audit repaired to 42/42 + 6 honest skips; the brand hook
(`components/useSiteBrand.ts`). Two settled decisions were written into
AGENTS.md: the two platforms and their one-directional connection, and the gear
shelf.
