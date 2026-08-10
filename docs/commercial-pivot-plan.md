# Commercial pivot: discovery, booking referral, and advertising

**Status: decisions taken, Phase 1 in progress.**
See "Decisions taken" at the foot of this document.

This is the pre-work the brief asked for: what exists today, what the new
architecture is, and what changes page by page. Everything below was read out of
the codebase rather than recalled — counts and file paths are current as of
`652b3fa`.

---

## 0. What this changes, in one paragraph

Today the site's business is personal planning: the primary CTA on almost every
page is "start a trip" or "tell us about the trip", and the money question is
answered with "quoted once we understand it". The pivot makes the business a
**referral and advertising** one: the primary conversion becomes a tracked
partner click, personal assistance becomes a discreet option inside Contact, and
the site's real asset — the kosher, Shabbos and neighbourhood research — becomes
the reason a visitor books *here* rather than on Booking.com directly.

**The asset is the research, and it must not be spent.** Every commercial
decision below is subordinate to one rule: nothing a partner pays for may change
a verification label, a kashrus statement, or an editorial ranking. That is not
a compliance checkbox — it is the only reason this site can charge for a click
that Expedia cannot.

---

## 1. Current route inventory

**44 public page routes, 31 admin, 70 API.** Grouped by what they do now and
what happens to each.

### Vacation / discovery — the commercial core
| Route | Today | Plan |
|---|---|---|
| `/` | Vacation-first homepage, planning CTA | **Rebuild** booking-first (Phase 1) |
| `/vacation-ideas` | Hub, 18 destinations, filters | **Becomes** `/destinations` (redirect kept) |
| `/vacation-ideas/[destination]` | 18 prerendered destination pages | **Restructure** to the 14-section order (Phase 2) |
| `/kosher-stays` | Read-only stays directory | **Becomes** `/hotels` — dates, travelers, filters, availability (Phase 2) |
| `/attractions` | 138 attractions, "Their website" links | **Becomes** `/things-to-do`, bookable where inventory exists (Phase 2) |
| `/book` | Flights/hotels/cars, kevarim-flavoured | **Rewrite** hotels-first, vacation wording (Phase 1) |
| `/book/review` | Duffel flight checkout | **Keep, unchanged.** See §3 on not expanding it |
| `/getaways` | Redirect → `/vacation-ideas` | Keep, chains to `/destinations` |

### Kosher information — the reason to book here
`/kosher`, `/kosher-travel`, `/verification`, `/travel-guide`,
`/travel-insurance`, `/phone-rentals`. **All kept.** `/travel-insurance` and
`/phone-rentals` become the anchors of the *Before You Go* area rather than
standalone pages nobody reaches.

### Heritage — supporting section
`/heritage`, `/cemeteries`, `/cemeteries/[cemetery]`, `/tzaddikim`,
`/tzaddikim/[person]`, `/stops`, `/destinations/[place]`, `/[city]`, `/lizensk`,
`/map`. **All kept, unchanged in content**, gaining commercial actions
(hotels/flights/car/driver/eSIM/insurance) on the heritage landing and town
pages.

> ⚠️ **Naming collision to resolve before Phase 1.** `/destinations/[place]` is
> already the *heritage town* route. The new primary nav item "Destinations"
> must point at the vacation hub. Proposal: vacation hub takes `/destinations`,
> heritage towns move to `/heritage/towns/[place]` with permanent redirects.
> This is a real migration with SEO consequences and needs a decision — the
> alternative is keeping the vacation hub at `/vacation-ideas` and labelling the
> nav item "Destinations", which costs nothing and is my recommendation.

### Planner / account
`/itinerary`, `/itinerary/print`, `/my-route`, `/i/[shareId]`,
`/i/[shareId]/print`, `/account`, `/login`. **Kept and free.** Nav label becomes
**My Trips**.

### Personal planning — to be demoted
| Route | Today | Plan |
|---|---|---|
| `/services` | 6 services, in primary nav | **Out of primary nav.** Split: commercial parts absorbed into the relevant journeys; the personal-assistance part moves inside Contact |
| `/plan` | 3-step planning wizard, hero CTA | **Repurposed** as the "Help me choose" discovery flow — same steps, commercial outcome. No longer promoted as "have us plan it" |
| `/contact` | One long trip questionnaire | **Rebuild** as four reasons with conditional fields |
| `/flight-booking-assistance` | Public page, inert form | **Noindex, out of nav**, reachable from Contact only |
| `/sample-itinerary` | Proof page (built last week) | **Keep** — becomes an email lead magnet |
| `/honeymoon` | "We are building this page…" | **Remove now**, rebuild in Phase 4 as a collection |

### Low-trust / empty — to be removed or fixed
`/directory` (see §8), `/submit`, `/command-center`, `/info/[slug]`,
`/access`, `/version`.

---

## 2. Current commercial-link inventory

Everything that can earn money today. **This is the state to migrate from.**

### Configured partner integrations
| Partner | Where the code lives | How it is configured | Products |
|---|---|---|---|
| **Travelpayouts** | `lib/travelpayouts.ts`, `-store.ts` | `TRAVELPAYOUTS_MARKER` + one pasted link per slot, `/admin/settings/earnings` | flights, hotels, cars |
| **Stay22** | `lib/stay22.ts`, `-store.ts` | `aid` + provider, admin | hotels (meta) |
| **Kayak** | `lib/kayak-search.ts` | `KAYAK_AFFILIATE_PARAMS` env | flights, cars |
| **Booking.com** | inline in `BookPartners.tsx:416` | `BOOKING_AFFILIATE_ID` env | hotels |
| **Duffel** | `/api/flights/*`, `/book/review` | `DUFFEL_ACCESS_TOKEN` | flights (**real booking, not referral**) |
| **Travel extras** | `lib/travel-extras.ts`, `-store.ts` | up to 8 owner-entered links, admin | eSIM, insurance, transfers |

### Where commercial links are rendered today
- **`components/BookPartners.tsx` (~900 lines) is the only real commercial
  surface on the site.** It holds all three tabs, both pay modes, and builds
  Booking.com and Kayak URLs inline.
- `components/TravelExtras.tsx` — on `/book` only.
- `components/ItineraryBuilder.tsx` — "Book the flights" → `/book?…`.
- `components/DestinationActions.tsx` — "Find flights" per airport.
- `components/PracticalInformation.tsx`, `app/travel-guide/page.tsx` — one link each.

### Untracked outbound links — money on the floor
| Where | Count | Note |
|---|---|---|
| `data/attractions.ts` `website` | **103 of 138** | Rendered as "Their website". No tracking, no ticket partner |
| `data/kosher-stays.ts` `website` / `sourceUrl` | 38 records | Several are raw `booking.com` URLs used as *sources* |
| `data/cemeteries.ts`, `data/practical-content.ts` | ~8 | Raw `booking.com` links inside heritage notes |
| Provider directory `website` | 30 records | Straight to the provider |

### What already works and must not be broken
`tests/affiliate-links.test.ts` asserts every `openPartner()` call in
`BookPartners.tsx` carries a marker — it exists because **car hire silently went
out untagged for a period and earned nothing while looking identical**. The new
centralised system must inherit that guarantee and widen it.

### Disclosure
**There is none anywhere on the site today.** Not in the footer, not beside a
booking action. This is both a legal exposure (FTC 16 CFR 255, UK CAP/CMA, EU
UCPD) and a Phase-1 blocker.

---

## 3. Affiliate-partner architecture

### The rule that shapes it
> Every booking link on the site is produced by one function, from one registry,
> and passes through one redirect that records the click.

No component builds a partner URL. `BookPartners.tsx` building
`https://www.booking.com/searchresults.html?...` inline is exactly what makes an
expired campaign or a dropped marker invisible.

### Modules

**`lib/affiliate/partners.ts`** — the registry. One record per partner:

```
id                 "stay22" | "travelpayouts" | "kayak" | "booking" | "getyourguide" | …
label              shown in the disclosure: "Booking.com"
products           ("hotel" | "flight" | "car" | "transfer" | "activity" |
                    "insurance" | "esim" | "programme")[]
status             "active" | "paused" | "expired"      ← expired-partner handling
build(request)     (product, destination, dates, pax, deepLink?) → URL
fallbackPartnerId  where a click goes when this one is expired or misconfigured
requiresDisclosure boolean (all true today; kept explicit)
configuredBy       "env" | "store"  — so the admin can say what is missing
```

**`lib/affiliate/link.ts`** — pure. `affiliateHref(request) → { href, partner,
tracked }`. `tracked: false` when nothing is configured, so the UI can degrade to
a plain link rather than pretending.

**`/go/[click]` route handler** — every commercial link points here, not at the
partner. It records the click, then 302s to the partner URL. Reasons: the URL a
crawler sees is ours; an expired partner is swapped server-side without a
redeploy; and a click is recorded even when the browser blocks beacons. Carries
`rel="sponsored noopener"` on the anchor.

**Click record** (`lib/affiliate/clicks.ts`, Redis + optional Prisma):

```
id, partnerId, product, destinationSlug, page, placement, campaignId,
checkIn, checkOut, adults, children, rooms,     ← only when the partner accepts them
sessionId (anonymous, rotating), accountId?,    ← never a religious preference
createdAt, userAgentClass ("mobile"|"desktop"),
conversionStatus, commissionAmount, commissionCurrency, reconciledAt
```

> **Privacy line, non-negotiable.** Kosher standards, Shabbos requirements and
> heritage interest are collected to *do the job the visitor asked for*. They
> never enter a click record, an advertising profile, or a segment sold to a
> partner. This is written into the type — the click record has no field for
> them — rather than left to discipline.

**Commission import** — CSV per partner into `/admin/affiliates/commissions`,
matched on click id or partner reference. No invented conversions: an unmatched
row is shown as unmatched.

### What is deliberately NOT built
- No payment, no cancellation, no customer-service surface. The partner completes
  the transaction. **The existing Duffel flight booking at `/book/review` is the
  one exception and it stays exactly as large as it is** — expanding it is the
  separate legal and operational scope the brief says needs explicit approval.
- No structured-data `offers`/`seller` marking White Glove as the seller (§9).

### Admin report — `/admin/affiliates`
Clicks · CTR by placement · revenue by partner / destination / page / placement ·
conversion rate · average commission · **broken links** (a nightly HEAD check on
every generated template) · **expired campaigns**.

---

## 4. Advertising-placement inventory

### What exists
`Promotion` (`lib/admin-content.ts:118`) already carries advertiser name, phone,
email, target paths, device, start/end dates, priority, `maxViewsPerVisitor`,
impressions, clicks, `enabled`. **11 placements are typed; 6 render**
(`LIVE_PLACEMENTS`). `sidebar`, `destination-specific`, `accommodation-page` and
`sponsored-listing` are declared and display nowhere.
`lib/ad-performance.ts` computes state, CTR and "concerns".

### The gaps
| Gap | Consequence |
|---|---|
| No **Advertiser** entity | The advertiser is four loose fields on each ad; no cross-campaign view, no renewals, no billing |
| No **Campaign** entity | Cannot group creatives or report on a campaign |
| No `"Sponsored"` label rendered anywhere | **Legal exposure.** Paid placement must be identifiable |
| `enabled` only — no Draft/Preview/Publish | An ad is live the moment it is saved |
| 4 placements typed but dead | The admin offers positions that do nothing |
| No invoicing, no leads | Cannot run this as a business |

### Proposed placement inventory — **one premium position per page**
| Placement | Page | Product | Label |
|---|---|---|---|
| `home-seasonal` | `/` seasonal section | Seasonal campaign | Featured partner |
| `destination-sponsor` | one per destination page | Destination sponsor | Sponsored |
| `hotels-featured` | `/hotels` results | Featured partner | Featured partner |
| `things-to-do-featured` | `/things-to-do` | Featured partner | Featured partner |
| `before-you-go` | insurance/eSIM contexts | Featured partner | Sponsored |
| `directory-enhanced` | partner directory | Enhanced listing | Featured partner |
| `article-sponsored` | sponsored article | Sponsored article | **Sponsored content** |

Existing `popup`, `fixed-top-banner`, `sticky-bottom-banner` and
`full-page-takeover` are **retired for advertising** (kept for the owner's own
site notices). The brief says no banner clutter; a full-page takeover on a
premium travel site is the opposite of calm.

### The wall, stated in code
`lib/verification.ts` and `lib/trust-status.ts` must have **no import path from
the advertising modules**, enforced by a test. A sponsor buys placement and a
label; it cannot buy a status. The existing `featuredDisclosure()` in
`lib/features.ts` (already written for exactly this problem) becomes the model.

---

## 5. Proposed navigation

**Primary bar (7 + CTA)** — the brief's nine items exceed what fits at 1280px
alongside the search and sign-in, so Cars & Transfers folds under Flights'
sibling group and Things to Do keeps its place:

```
Destinations · Hotels & Stays · Flights · Things to Do · Kosher Travel ·
Heritage Travel · My Trips          [ Search & Book ]   (primary, filled)
```

**Cars & Transfers** sits in the menu panel under a "Getting there" group with
Flights, and has its own page `/cars`. If you would rather have all nine in the
bar, the sign-in link moves into the menu — tell me which.

**Menu panel groups**: Plan · Where to go · Getting there (Flights, Cars &
Transfers, Before You Go) · Kosher travel · Heritage travel · White Glove
(About, Verification, **Advertise with us**, Contact).

**Removed from primary nav:** Travel Services.
**Footer:** Contact, verification, privacy, terms, advertise. **Owner login
comes out of the public footer** (`/admin` still reachable directly).

**Never in primary navigation:** "Have us book it", "Personal planning",
"Free planning".

---

## 6. Page-by-page commercial conversion plan

| Page | Primary conversion | Secondary | Personal assistance? |
|---|---|---|---|
| `/` | Search form → `/hotels` results | Explore destinations · save trip · email | **No** |
| `/destinations` | "See hotels" per card | View destination | **No** |
| `/destinations/[slug]` | Sticky "See places to stay" → `/hotels?destination=…&dates` | Flights · cars · activities · insurance/eSIM · save | **No** |
| `/hotels` | "Check availability" (tracked) | Save · "Where should I stay?" tool | **No** |
| `/flights` | Flight search (tracked) | Save to trip | **No** |
| `/cars` | Car / transfer search (tracked) | Driver enquiry (heritage routes) | **No** |
| `/things-to-do` | "Check tickets" where inventory exists | Add to trip | **No** |
| `/book` | Hotels first, then flights, cars, transfers, activities | Add to trip | **No** |
| `/kosher-travel` | Contextual: stays in this quarter, eSIM, insurance | Email list | **No** |
| `/heritage` | Hotels near the town · flights · car · driver · connectivity · insurance | Kevarim directory | **No** |
| `/itinerary` | Re-open a saved search; contextual booking per stop | Share · print | **No** |
| `/contact` | Advertising enquiry · correction · question | — | **Yes — the only place** |
| `/advertise` | Advertiser enquiry form | — | **No** |

**Disclosure placement:** immediately adjacent to the commercial action —
"White Glove may earn a commission if you book through a partner link, at no
additional cost to you." One editable string, rendered by the same component
everywhere, never only in the footer.

**Accommodation honesty ladder** — four states, distinct everywhere a property
appears. Current inventory: **1 kosher hotel, 2 seasonal programmes, 1 kosher
B&B, 18 kosher-friendly-in-quarter, 16 ordinary-well-placed.** An ordinary hotel
is never described as kosher; a neighbourhood recommendation is never presented
as a property.

---

## 7. Tracking event specification

Extends `/api/analytics` (which today records only `page_view` and `search`).
All events carry `sessionId` (anonymous, rotating), `page`, `placement`,
`device`. **None carries a religious preference.**

| Event | Payload |
|---|---|
| `destination_view` | destinationSlug |
| `search_start` / `search_complete` | product, destination, dates?, pax?, resultCount |
| `search_no_results` | product, destination, filters |
| `booking_click` | partnerId, product, destinationSlug, placement, campaignId?, clickId |
| `stay_recommendation_complete` | destinationSlug, neighbourhood, resultCount |
| `trip_save` / `trip_item_save` | itemType |
| `email_signup` | source (lead magnet), destinationInterest?, season? |
| `ad_impression` / `ad_click` | campaignId, placement |
| `advertiser_enquiry` | placementInterest |
| `assistance_enquiry` | — (counted, never profiled) |

**Derived reports:** CTR by placement · revenue by destination / page / placement ·
revenue per visitor · **revenue per 1,000 destination visitors** · conversion
rate · mobile vs desktop · highest-converting destinations · searches with no
results (already half-built: `getEmptySearches()`).

---

## 8. Content and feature removal list

| Item | Action | Why |
|---|---|---|
| `/honeymoon` | **Remove now** (410 or redirect to `/destinations?theme=couples`) | Says "We are building this page" |
| Travel Services in primary nav | Remove | Brief |
| "Have us plan it" / "Tell us about your trip" as primary CTAs | Remove from `/`, destination pages, `/book` | Brief |
| "White Glove is new" notice | Replace with a small verification line | Brief |
| Category counts on `/` | **Already done** last week | Beach = 1 |
| "Everything is free" claims | Reduce to one statement on the planner | 8 occurrences found |
| Long verification explanations on commercial pages | Reduce to the one-line statement + link | Brief |
| Kevarim/shomer wording on `/book` | Remove; keep one secondary line | Brief |
| Owner login in public footer | Remove | Brief |
| `sidebar`, `destination-specific`, `accommodation-page`, `sponsored-listing` placements | Implement or delete | Typed, render nowhere |
| `popup` / `full-page-takeover` ad kinds | Retire for advertising | Brief: no popups |
| "Their website" on 103 attractions | Replace with a tracked ticket action where inventory exists | Brief |

### The provider directory — a real finding
`data/directory.ts` holds **30 providers across 4 categories**. But
`readProviders()` (`lib/directory.ts:132`) returns **only database rows the
moment the database has one published row** — the 30 built-in providers are
dropped entirely. That is why the live site shows one provider and the filters
read zero planners, zero agencies, zero guides.

**Recommendation:** fix the fallback so built-in providers merge with database
rows (a small, contained change), *and* reposition the page as a curated partner
network with empty categories hidden. Do not sell enhanced listings until the
directory has credible inventory and the site has measurable traffic — the brief
says so and it is right.

---

## 9. Migration plan for existing booking links

**Five stages, each shippable and reversible.**

1. **Registry, no behaviour change.** Build `lib/affiliate/*` and register the
   five configured partners. `affiliateHref()` reproduces today's URLs
   byte-for-byte. A test asserts the old and new builders agree, so the
   migration cannot silently drop a marker — the failure mode
   `tests/affiliate-links.test.ts` was written for.
2. **Route every existing link through `/go/[click]`.** `BookPartners`,
   `TravelExtras`, `ItineraryBuilder`, `DestinationActions`,
   `PracticalInformation`, travel guide. Old direct URLs keep working; nothing
   is deleted until stage 5.
3. **Disclosure everywhere**, from one editable string.
4. **New surfaces** — destination sticky CTA, hotel cards, attractions,
   Before You Go — built only on the registry.
5. **Delete the inline URL builders** in `BookPartners.tsx` and tighten the
   affiliate test to forbid any partner hostname outside
   `lib/affiliate/partners.ts`.

**Data migration:** `TRAVELPAYOUTS_MARKER`, `KAYAK_AFFILIATE_PARAMS`,
`BOOKING_AFFILIATE_ID` and the Stay22 settings are read into the registry, so no
owner reconfiguration is needed. `/admin/settings/earnings` keeps working and
gains partner status and last-click-seen.

**Raw `booking.com` URLs inside `data/cemeteries.ts` and
`data/practical-content.ts` are sources, not offers.** They keep their `rel` and
stay untracked; converting a citation into an affiliate link would make the
source itself commercial, which is the one thing the verification system cannot
survive.

---

## 10. Proposed implementation order

| Phase | Contents | Rough size |
|---|---|---|
| **1** | Positioning + navigation · booking-first homepage · `/book` rewrite · disclosures · affiliate registry + `/go` + click tracking · remove `/honeymoon` and the low-trust items · personal assistance into Contact only | 6–8 stages |
| **2** | `/hotels` with dates and travelers · destination-page restructure + sticky CTA · "Where should I stay?" · contextual flights/cars/activities/insurance/eSIM · date persistence | 6–8 stages |
| **3** | `/advertise` · advertiser + campaign entities · Draft/Preview/Publish · sponsored labels + reporting · directory → curated partner network | 5–6 stages |
| **4** | Seasonal collections · indexable commercial collection pages · email capture + follow-ups · destination expansion against the existing publication bar | 4–6 stages |

Each stage: lint, `tsc --noEmit`, tests, `npm run audit:ui`,
`npm run audit:destinations`, production build.

---

## Decisions taken

1. **Route naming — move heritage.** The vacation hub takes `/destinations`;
   heritage towns move to `/heritage/towns/[place]` with permanent redirects.
   This is a real migration and carries the SEO risk noted above; it is
   scheduled as its own stage with the redirects landing in the same commit.
2. **Navigation — Cars & Transfers in the menu.** Seven items in the bar plus
   the primary action; Cars keeps its own page at `/cars` and is linked from
   every destination page. One line to swap later.
3. **Programmes joined: Travelpayouts and Stay22.** Nothing else.
4. **Duffel off the public site**, kept working in the admin only.

### A correction to §2 and §3, made after these answers

I had described Kayak and Booking.com as affiliate partners alongside
Travelpayouts, which made "we have Travelpayouts and Stay22" read as "Kayak and
Booking.com come out". **That was wrong, and the opposite is true.** Kayak and
Booking.com are where the traveler LANDS; Travelpayouts is the network that is
paid for sending them, and it works by wrapping their URL (`?u=<the search>`).
Removing them would remove the thing Travelpayouts is paid to forward to.

So the registry separates two axes rather than keeping one list:

| | |
|---|---|
| **Network** — who records and pays | Travelpayouts, Stay22, or `none` |
| **Destination** — where the traveler arrives | Kayak, Booking.com, Stay22's provider |

`none` is a real, reported state meaning the link works and earns nothing. A
link that breaks because the money is not configured costs a customer to save a
commission; the site keeps the link and makes the state legible in the admin
instead — which is the failure mode the untagged-car-hire episode was.

### Phase 1 progress

**Phase 1 is complete.** Everything below is merged and live.

| Stage | State |
|---|---|
| Affiliate registry, `/go` redirect, click tracking, disclosure | **Done** — `db4113e` |
| Duffel off the public site, into the admin, guarded | **Done** — `0475d9e` |
| Route migration: `/destinations`, heritage towns, redirects | **Done** — #224 · `lib/route-migration.ts` |
| Navigation rewrite | **Done** — #224 |
| Booking page rewrite, hotels-first | **Done** — #224 · `/hotels`, `/flights`, `/cars` |
| Homepage rebuild, booking-first | **Done** — #224 |
| Personal assistance into Contact only; remove `/honeymoon`, owner login, weak counts | **Done** — #224 · `lib/contact-reasons.ts` |

### Phase 2 progress

| Stage | State |
|---|---|
| `/hotels` with dates and travelers | **Done** — #224 · `lib/stay-search.ts` |
| Destination-page restructure + sticky CTA | **Done** — #224 · `DestinationStickyCta` |
| Date persistence across pages | **Done** — #224 · `SearchMemory` |
| Contextual flights, cars, activities, insurance, eSIM | **Part** — the slots render via `TravelExtras`; only hotels, flights and cars resolve to a partner. Activities, insurance and eSIM have no programme joined, so `routeFor` returns `none` and nothing is offered to visitors. |
| "Where should I stay?" | **Done** — `lib/quarter-search.ts` · `StayQuarters`. Each recommended quarter now searches on itself ("Le Marais, Paris") carrying the visitor's dates, instead of every quarter leading to the same whole-city search. |

**Phase 2 is complete** except for the products with no programme joined, which
is the settings state below rather than a stage.

### What earns today, on the live site

Re-checked against live endpoints after the Stay22 → Kayak flight chain was
traced end to end. This is a **settings and deploy** state, not “Kayak is
unapproved”.

| Product | Lands on | Network | Earns |
|---|---|---|---|
| Hotels | Stay22 | Stay22 (`aid` set) | **Yes** |
| Flights | Kayak (code default) | Stay22 once the Kayak link is pasted at `/admin/settings/earnings` | **Can earn** after that paste |
| Cars | Kayak (code default) | same | **Can earn** after the same paste on the Cars row |
| Transfers, activities, insurance, eSIM, programmes | — | none | Not offered |

**Kayak is approved via Stay22** (`aid=whitegloveitinerarie`). The live chain
`stay22.com/allez/kayak?aid=…&link=<search>` lands on English Kayak with the
route and both dates intact and credited. Aviasales deep links are broken —
`search.aviasales.com` 302s to `aviasales.ru` and discards every query
parameter — and are not fixable by tuning the URL. Code defaults are Kayak for
flights and cars; pasting
`https://kayak.stay22.com/whitegloveitinerarie/Te_B-47Q2I` into each earnings
row (accepted after #228) is what makes the click earn.

Until that paste is done, `routeFor` correctly reports the search as working
and earning nothing — which is the state the registry was built to make visible
rather than to hide.

**Nothing in this plan publishes an invented price, availability, review,
partner, advertiser or traffic figure.** Where inventory does not exist, the
slot stays empty and says so.
