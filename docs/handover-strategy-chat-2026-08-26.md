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

### The lint note's worked example — and a correction to this file

It points at `components/useSiteBrand.ts` as the model fix, and that is right:
the file exists and the Navbar and the Footer both use it. **An earlier version
of this page said it was not in the repo. That was wrong** — checked against a
stale local copy rather than `main` — and it is corrected here rather than
quietly, because a filed document is only worth having if its corrections are
themselves checked.

The hook is the model for one family of these errors: a value that legitimately
differs between server and client, read through `useSyncExternalStore` with a
server snapshot instead of rendering a guess and correcting it after mount.
`ItineraryFooter`, `KosherNearby` and `TripStartFlow` were the other three of
that family and now use it too.

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

## OPEN ITEM 1 — 50 lint errors, 25 warnings across the repo — DONE

Cleared on 26 August 2026 across eight small pull requests with the full
suite green between each. `npx eslint .` is clean. Three shared hooks came
out of it — `components/useOnActionSuccess.ts`, `useOnValueChange.ts` and
`useDebouncedSearch.ts` — and the last of those fixed a real bug six search
boxes shared: the previous query's results sat under the current text for a
full debounce and round trip. What follows is the original entry.

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

STILL OPEN, AND IT IS THE OWNER'S MACHINE THAT HAS TO DO IT. He was walked as
far as `npm install` on 26 August and stopped there because the audit takes the
machine over for several minutes — it drives a real browser through every
journey at two widths. It is waiting for a moment when he does not need the
computer. The four lines, in the project folder:

    npx playwright install chromium
    npm run build
    npx next start -p 3130          # leave this running
    node scripts/audit-flows.mjs    # in a second terminal

The other audits have all been run since and are clean: `audit:ui` is down to
19 findings, all of them the site notice's tab order, which is a settled
decision; `audit:destinations` 21/21; `audit:admin` 0; `audit:outage` 0 — every
page still answers 200 with the private store unreachable.

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

From the owner's 30-priority site audit. Worked through on 26 August, and most
of the list turned out not to be a list of gaps.

ALREADY BUILT, AND LEFT ALONE: split payments (`data/trip-payments.ts`), team
features (`components/TeamMembersPanel.tsx`, `/team/join`), the admin "Needs
Review" screen (`/admin/imports/needs-review`), inbox quick actions (reply,
mark answered, reopen on `/admin/messages`), mobile bottom navigation
(`components/MobileBottomBar.tsx`), change history on both sides (`/admin/history`
with undo, and the app's own Changes tab), Trip Mode (the app opens on today,
follows the clock through the day and carries a Now/Next card), and the adviser
home (`/pipeline`).

BUILT THEN: the Data Health dashboard (`/admin/data-health`), the map view
(kind filters and a linkable view, `lib/map-links.ts`), and the contextual
assistant (`lib/assistant-context.ts`).

STILL OPEN, AND EACH IS A QUESTION ABOUT WHAT HE WANTS RATHER THAN A GAP:
wallet expansion — what else belongs in it; destination-page simplification —
what to cut from a page with eight sections. A keyboard search palette was the
third; it was built as a shortcut into the search the site already has, with
nothing added to the page.

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
