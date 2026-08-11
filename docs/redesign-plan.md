# Vacation-first redesign — inventory and plan

White Glove Itineraries was built kevarim-first. Everything global said so: the
front page opened with "two kinds of journeys" and put the heritage card first,
the navigation bar led with **Destinations** (which opened the kevarim
directory) and **Cemeteries**, the footer asked for "your kevarim, dates, and
kosher needs", and a modal stopped every first visit.

None of that was wrong for the heritage side. It was wrong as the whole
proposition, because the business plans kosher **vacations** and the site never
said so within five seconds.

This document is the survey taken before any of it was changed, and the plan
that came out of it. It is kept because the next person to widen the site will
need the same map.

---

## 1. Route inventory (public)

### Front and planning

| Route | What it is | Redesign role |
| --- | --- | --- |
| `/` | Homepage — heritage-first hero, two-card "kinds of journeys" split, six kevarim, services | **Rebuilt** vacation-first |
| `/plan` | — | **New.** Guided trip-start flow (three steps) |
| `/itinerary` | Full itinerary planner (client-side, account-backed) | Kept; onboarding added above it |
| `/itinerary/print`, `/i/[shareId]`, `/i/[shareId]/print` | Printable and shared itineraries | Untouched |
| `/my-route` | Saved places in driving order | Kept, listed under Heritage and in the planner |
| `/account`, `/login`, `/access` | Account, sign-in, site access code | Untouched |

### Vacation

| Route | What it is | Redesign role |
| --- | --- | --- |
| `/getaways` | One editable hero block and nothing else | **Redirects** to `/vacation-ideas` |
| `/vacation-ideas` | — | **New.** The vacation hub, filterable |
| `/vacation-ideas/[destination]` | — | **New.** Destination template |
| `/honeymoon` | Editable page, "future service" wording | Kept, linked from Vacation Ideas as a category |
| `/attractions` | 139 real attractions, filterable | Kept; heritage sub-brand banner removed |
| `/kosher-stays` | 69 real stays + 20 quarters | Kept; banner removed |

### Kosher travel

| Route | What it is | Redesign role |
| --- | --- | --- |
| `/kosher-travel` | — | **New.** Hub over the resources below |
| `/kosher` | Curated kosher food finder + researched eateries | Kept |
| `/directory` | Provider directory (drivers, shomrim, services) | Kept |
| `/travel-guide` | Entry documents, payments, advisories | Kept |
| `/verification` | — | **New.** What the four status labels mean |

### Heritage

| Route | What it is | Redesign role |
| --- | --- | --- |
| `/heritage` | — | **New.** שתוליכנו לשלום landing page |
| `/stops` | Destination + kevarim directory | Kept, reached through Heritage |
| `/cemeteries`, `/cemeteries/[cemetery]` | Beis hachaim records | Kept, off the primary bar |
| `/tzaddikim`, `/tzaddikim/[person]` | 327 kevarim by name | Kept |
| `/[city]` | 15 researched city guides at the root (`/uman`, `/lizensk`, …) | Untouched |
| `/destinations/[place]` | ~300 bulk destination stubs | Untouched |
| `/map` | Everything plottable on one map | Kept; banner removed (it carries stays and airports too) |
| `/lizensk` | Hand-built guide | Untouched |

### Services and commerce

| Route | What it is | Redesign role |
| --- | --- | --- |
| `/services` | Editable page, two card blocks | **Restructured** into six named services |
| `/book`, `/book/review` | Flight/hotel/car search (Duffel, Kayak, Stay22) | Kept, moved **out of the primary bar** |
| `/flight-booking-assistance`, `/phone-rentals`, `/travel-insurance` | Editable service pages | Kept under Travel Services |
| `/contact` | Editable hero + generic contact form | **Rewritten** vacation-neutral, structured form |
| `/submit` | Send in a kever, cemetery or provider | Kept under Heritage |
| `/privacy`, `/terms`, `/version`, `/sitemap.xml`, `/robots.txt` | Utility | Untouched |
| `/admin/**`, `/api/**`, `/command-center` | Owner tooling and machinery | Untouched |

### Why `/book` came off the bar

`/book` is not itself access-code protected, but the whole site can be closed
(`edgeSiteIsLocked`) and individual paths can be locked from
`/admin/settings/limits`, in which case a visitor pressing a primary CTA lands
on `/access`. The flights/hotels/cars search is also the least finished part of
the public site. It stays reachable — from Travel Services, from the planner,
from the footer — but no primary navigation item or hero button leads there.

---

## 2. Component inventory (the ones this touches)

**Global chrome**
`Navbar` (search, primary bar, overflow menu, sign-in, members-only links),
`Footer`, `SitePromotions`, `PromotionBanner`, `BetaNoticeModal`,
`SubBrand` (`SubBrandBanner`, `SubBrandCrest`), `StructuredData`, `SiteTracker`.

**Search** `DestinationSearch` (combobox with keyboard support) over
`/api/search` → `lib/site-search.ts`, which already covers guides, batei
hachaim, attractions, stays, quarters and eateries.

**Content rendering** `PageBlocks` + `PageBody` render the CMS blocks
(`hero | text | cards | list | image | buttons | quote | note`) for the eight
editable pages in `data/pages.ts`.

**Directories** `DestinationDirectory`, `CemeteryDirectory`,
`AttractionDirectory`, `KosherStayDirectory`, `EateryDirectory`,
`DirectoryBrowser`, `ListToolbar` (shared list search/sort).

**Planner** `ItineraryBuilder` (2,200 lines: trips, dates, travelers, notes,
flights with connections, lodging, stops, route planning, borders, documents,
sharing, comments, printing), `TripProgressStrip`, `TripSwitcher`, `DayProgress`,
`SharedWithMe`, `ShareItineraryPanel`, `StopAttachments`, `KosherNearby`,
`SavePlaceButtons`, `SendPlaceIn`, `TripComments`, `PrintableItinerary`.

**Forms** `ContactForm`, `InquiryForm` (unused), `ComingSoonNotice`,
`SuggestEditButton`, `SubmitEntryForm`, `useFormDraft` + `lib/drafts.ts`.

**Small shared pieces** `SectionHeading`, `GloveMark`/`GloveList`/`GloveRule`,
`DestinationCard`, `BilingualLabel`, `MixedText` (Hebrew/Yiddish with
`dir`/`lang`), `HechsherBadge`, `TravelAdvisoryBadge`, `MembersOnlyLink`,
`FullPagePlaceholder`, `SectionPlaceholder`, `DateField`, `SearchableSelect`,
`useFocusTrap`.

**New in this redesign** `VerificationBadge`, `TripStartFlow`,
`PlanningRequestForm`, `VacationIdeasHub`, `VacationCard`, `TripSetupPanel`,
`NewSiteNotice`, `ServiceCatalog`.

---

## 3. Information architecture

```
Plan a Trip          /plan            guided start → planner or personal planning
Vacation Ideas       /vacation-ideas  browse by trip type, season, kosher practicality
  └ destination      /vacation-ideas/[slug]
Kosher Travel        /kosher-travel   food · stays · hechsherim · Shabbos · directory · documents
Travel Services      /services        six services, then booking, phones, insurance
Heritage Travel      /heritage        שתוליכנו לשלום — kevarim, batei hachaim, tzaddikim, routes
Sign In              /login
Start Planning       /plan            primary button
```

Everything heritage — kevarim, cemeteries, tzaddikim, the heritage directory,
the heritage map view, `/submit` — hangs off Heritage Travel. **Cemeteries is
not a top-level item**, and no navigation item called "Destinations" opens the
heritage directory: vacation customers read that word as vacation destinations.

`/book` is reachable from Travel Services and from the planner, and from
nowhere that a first-time visitor would treat as the main action.

---

## 4. Existing functionality preserved

Nothing below was rebuilt, replaced or degraded for the sake of the redesign.

- **The itinerary planner in full** — trip name, dates, day start, travelers and
  ages, notes, flights with connections and overnight handling, lodging,
  stops, saved-route import, route planning with real road times, border
  crossing allowances, day progress, documents and attachments, trip
  switching, sharing and collaborators, comments, printing, booking links.
- **Accounts** — registration, sign-in, Google sign-in, verification, password
  reset, plans and limits, idle logout, saved places, shared-with-me.
- **The heritage database** — 300+ destinations, 15 researched city guides,
  the cemetery records with burials, coordinates, arrival notes, shomer
  contacts and sources, 327 tzaddikim, traditional Yiddish names, the
  verification statuses and completeness queue.
- **Kosher data** — the curated kosher food finder, the researched eateries
  and their hechsher statuses, the stays with their `kosherClaim` and seasons,
  the quarters and their anchors.
- **Owner tooling** — the whole admin, the editable pages, the editable site
  words, promotions and advertisements, the directory listings, photo
  submissions, suggestions, the recycle bin, analytics.
- **Search** — the one `/api/search` index over everything.
- **SEO** — `pageMetadata`, the sitemap built from the same lists the pages are,
  robots, structured data.

---

## 5. Page-by-page plan

**Homepage** — rebuilt in the required order: dismissible notice, vacation hero
(the supplied copy), trip-type selector, how it works, vacation categories,
featured destinations, plan-it-yourself vs have-us-plan-it, kosher resources,
heritage section, verification explanation, closing CTA. Testimonials are
**omitted**: there is no real testimonial data and inventing one is out.

**Navigation** — driven by `lib/navigation.ts` so the rules are testable. Search
and sign-in behaviour, the overflow menu and the members-only links keep
working exactly as they do.

**Vacation Ideas** — a hub over `data/vacation-destinations.ts`, which is built
from the destinations the site already holds real data for. Kosher availability
and Shabbos practicality are **computed** from the eateries, stays, quarters
and seasons on record — never asserted. A destination with nothing to say about
a facet says so rather than showing an empty filter.

**Destination template** — overview, why visit, best time, ideal length, who it
suits, where to stay, things to do, kosher food, Shabbos, minyanim and mikvaos,
transport, a suggested outline, cautions, add-to-trip and request-planning.
Sections with no data render an honest empty state, and every fact carries its
status.

**Trip-start flow** — three steps, everything skippable, "I don't know yet" on
every question. Self-service opens the planner with the answers applied;
personal service opens the planning request with the answers already filled in.

**Planner** — a setup panel above the existing builder: the basics first, a
progress indicator, vacation templates, plain-language explanations, instructive
empty states, an explicit note about where the trip is saved and what an account
adds, and a persistent but non-interrupting "Have us plan it".

**Heritage Travel** — its own landing page carrying the שתוליכנו לשלום identity,
with the search, the country browse, the complete guides, the route builder, the
kosher practicalities and the verification methodology.

**Services** — six services, each with who it is for, what is included, how it
works, what you receive, the next action, and what to expect about price. The
editable hero stays editable.

**Contact** — "Tell us about the trip you want to take", with conditional
fields; kevarim are asked about only when Heritage Journey is chosen.

**Verification** — one methodology page explaining Verified, Reported, Being
checked, and Reconfirm before travel, linked from every badge.

---

## 6. What was actually built, and how it was checked

### New routes

`/plan` · `/vacation-ideas` · `/vacation-ideas/[destination]` (18) ·
`/kosher-travel` · `/heritage` · `/verification`. `/getaways` redirects
permanently to `/vacation-ideas`, and the CMS still knows that page by its old
slug so nothing the owner wrote there is lost.

### New modules, and why each is a module rather than a component

| Module | Why it is separate |
| --- | --- |
| `lib/navigation.ts` | The bar is the positioning. Its rules are tested, not commented. |
| `lib/trust-status.ts` | One vocabulary where there were four. Mapping in one place. |
| `lib/vacation-ideas.ts` | Kosher and Shabbos answers computed from real records, testable without a browser. |
| `lib/vacation-sources.ts` | The server read, kept out of the client bundle. |
| `lib/trip-plan.ts` | What a set of planning answers is, and what it turns into. |
| `lib/trip-setup.ts` | What "started" means for a trip, and what a template may and may not overwrite. |
| `data/vacation-destinations.ts` | Editorial only. No fact about kosher food, Shabbos, hotels or opening. |
| `data/services.ts` | Six services, six questions each, including price. |

### Deleted

`components/BetaNoticeModal.tsx` (replaced by the dismissible strip),
`components/InquiryForm.tsx` (unused; superseded by `PlanningRequestForm`),
`components/DestinationCard.tsx` (unused after the homepage rebuild).

### Checks

`npm run check` — lint, `tsc --noEmit`, and the test suite — plus
`npm run build`, after every stage. The suite went from 1,480 tests to 1,640;
the new ones cover the navigation rules, the four-label status system, the
vacation indicators and filters, the planning flow and its handoff, the
conditional kevarim field, the planner templates, the homepage order, and the
accessibility invariants that can be read from source.

`npm run audit:ui` loads 17 pages in a real browser at 8 widths and measures
what source cannot tell you. Two checks were added to it for this work —
heading order, and the contrast of every rendered line against whatever is
actually painted behind it — and it reports what it cannot measure (gradients,
sliding pills) rather than guessing at them.

It found five things worth having:

1. **The accent gold was unreadable as text.** `--gold` is 2.6:1 to 3.2:1 on
   the site's own backgrounds, and it was the colour of every small-caps
   eyebrow on the site. Split into `--gold` for borders and `--gold-ink`
   (#7a602c, 4.79:1 at worst) for words, across 307 usages.
2. **The focus ring could be removed by a utility class.** It was wrapped in
   `:where()`, which has zero specificity, so `outline-none` on an input beat
   it — a dozen fields across the search box, the booking form, the map
   filters and the planner had no focus ring at all.
3. **The new-site notice collapsed on a phone.** A `shrink-0` column of
   buttons beside a `flex-1` paragraph squeezed the text to a few characters
   wide and made the notice eight thousand pixels tall. Nothing overflowed and
   nothing looked wrong above the fold.
4. **The vacation card washes failed contrast.** The eyebrow is gold-light at
   11px on a gradient; the beach wash gave 2.77:1. Every light end darkened
   until all six clear 4.5:1, with the numbers written into the file because
   the audit cannot measure a gradient.
5. **A heading level skipped** in the provider directory (h1 → h3), and the
   kosher-nearby button was 32px on a phone.

Final state: **0 findings** across all 17 pages and 8 widths.

### Known limits

- **No photography.** The picture library refuses an uncredited image and holds
  no destination photographs. Cards and destination pages are typographic until
  there are real, credited pictures; nothing else about them changes when there
  are.
- **No testimonials**, for the same reason.
- **The 17 pre-existing lint errors are untouched** (`react-hooks/set-state-in-effect`
  in nine older components). Nothing added here introduces a new one, and
  fixing those is a separate piece of work with its own risk.
- **`audit:ui` is Chromium only.** Safari's date and form controls still need
  checking by hand on a real device.
