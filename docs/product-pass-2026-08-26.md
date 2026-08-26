# Final product and UX pass — filed 26 August 2026

The owner's own scan, kept verbatim below the line so nothing is lost in
summary. **It is a brief, not a finding**: it says "implement" throughout, and
it was filed rather than executed because that is what he asked for when he
handed it over — "add it to the to do list and give me anything that you think
out."

## Read this part before acting on any of it

`docs/roadmap.md` opens with a warning earned the hard way: a stale claim in a
planning document costs real time, because somebody acts on it. The same
applies here in the other direction. **Several things this scan asks to build
already exist**, and a session that starts implementing from the top will
rebuild them — which Part E of the scan itself forbids.

What follows is the reconciliation, checked against the code on the day it was
filed. Check it again before acting: it will go stale too.

### Already built — connect or polish, do not rebuild

| Scan item | Where it already lives |
| --- | --- |
| C2 Admin global search | `components/AdminSearch.tsx`, `lib/admin-search-index.ts`, `lib/admin-search-types.ts` — 23 mapped result kinds, already wired into `AdminShell` |
| C1 Admin navigation grouping | `lib/admin-nav.ts` already has grouped sections with children and blurbs (91 entries), not a flat list |
| C6 Needs Review | `/admin/imports/needs-review` exists as a nav entry; `lib/import-review-queue.ts`, `lib/import-duplicate-resolution.ts`, `lib/suggestions.ts` |
| B6 One import pipeline | `lib/smart-import.ts` + `lib/smart-import-parse.ts` + `lib/import-prefill.ts` — already one pipeline, already takes pasted text and PDF, already reviews before writing |
| B5 Reusable library | `app/api/account/library/route.ts`, gated to Advisor Starter and up |
| B1 Advisor home | `components/PipelineDashboard.tsx` over `data/trip-pipeline.ts` (stages), `data/trip-reminders.ts`, `data/trip-payments.ts`, `data/clients.ts` |
| B10 Split payments | `data/trip-payments.ts`, `app/api/pay/[shareId]` |
| B11 Forms | `app/api/client-form/[shareId]`, `app/api/account/client-form` |
| B13 Companion app | `/app`, `components/PrintableItinerary.tsx`, the offline document cache in `public/sw.js` |

### Was not built, and now is

All four of these were built on 26 August 2026 and are merged. Do not build
them again; read the file named beside each one before changing how it works,
because each carries the reasoning for a decision that is easy to undo by
accident.

- **A4 Current Updates.** `data/current-updates.ts`, `lib/current-updates-store.ts`,
  `/admin/updates`, `components/CurrentUpdatesNotice.tsx` on the destination
  page. Every update carries a required end date and drops off the page the day
  it lapses. The list is cached; today is not cached with it. No source line and
  no dates on screen.
- **A5 Nearby.** `lib/near-anchors.ts` (airports, Jewish quarters, things to do
  — every position the site already owns), `app/api/near/where`, and
  `components/NearbyExplorer.tsx`, which replaced `NearMyHotel`. A city, a
  street or a postcode falls through to OpenStreetMap. The metered hotel lookup
  is a button, not a keystroke. Location is one door of three, asked for only
  inside the handler of the button that says so.
- **A3 Seasonal discovery.** `data/seasonal-spotlight.ts`,
  `lib/seasonal-calendar.ts` (Pesach and Sukkos off the Jewish calendar through
  kosher-zmanim), `lib/seasonal-windows-store.ts`, `/admin/seasons`. One prompt
  at a time, only inside its window, only when the category holds at least two
  destinations. Yeshiva week has no computed window on purpose. Distinct from
  the older "Featured this season" row, which is destination chips for the
  meteorological season and is unchanged.
- **B9 Group trips.** `data/trip-parties.ts`, `app/api/account/parties`,
  `/group`. Derived from the travelers already on the trip — no group record,
  no per-family copy of the itinerary. A party carries no form answers at all,
  and a response is attributed to a family by an exact, unambiguous name or not
  at all.

### The one in that list that was already built

- **B8 Options / client decisions.** The earlier reading of this was wrong.
  `data/proposal.ts` holds options with components and prices,
  `components/ProposalClientView.tsx` is the client's comparison view at
  `/p/[shareId]`, the statuses include `changes_requested` and `approved`, and
  `proposalOptionToStops()` converts the agreed option into ordinary itinerary
  rows. What was missing was the nudge when an approved proposal has not been
  converted, and that now fires (`proposal_approved_not_converted`).

### Still not built

- **Mikvaos in the nearby distances.** Not one mikvah record carries a
  coordinate, so an empty mikvah section would read as "there are none near
  you" — a different and untrue statement. Pinned by
  `tests/near-me-fences.test.ts`. If mikvaos ever gain coordinates, that test
  fails and says so.

### Partly built, and the work is the joining rather than the building

- **B7 / C6 one Needs Attention model.** There are at least four separate
  queues today — `lib/trip-reminders.ts`, `lib/trip-alerts.ts`,
  `lib/import-review-queue.ts`, `lib/suggestions.ts`. The scan asks for ONE
  concept. That is a consolidation, and it is the precondition for B1 and C3
  being worth doing, not a parallel task to them.

### One name collision worth settling before it spreads

`/command-center` and `lib/command-center.ts` already exist and mean something
else entirely: the KOSHER pre-trip check — "which of my five stops will I turn
up at and find a locked gate". Part C of the scan repeatedly calls the admin a
"control center". Those are two different things and must not converge on one
word. See AGENTS.md, "One name per thing".

### Already answered by a settled decision

- **B11's passport question does not need asking.** `docs/roadmap.md` records
  it as decided: the site does not store passport copies or identity documents.
  Per-trip notes exist instead, and the field says plainly that notes travel
  with the trip and are not the place for anything private. So the scan's "if
  passport information cannot be stored safely, do not enable insecure storage"
  is not an open question here — the answer is already no, and re-raising it
  would reopen a settled decision.

### Consistent with settled decisions

The scan's PERMANENT BUSINESS RULE — White Glove provides information and
software, never custom planning, never a concierge, never an assigned advisor —
restates AGENTS.md, "Personal trip planning has been removed". It does not
reopen it. Its Part A instruction not to redesign the settled homepage, and its
rule that Itineraries is a general product that must not market Kosher Travel,
are both already how the code behaves.

---

# FINAL WHITE GLOVE PRODUCT + UX PASS

This prompt replaces/combines my last three competitive-improvement prompts.

Work from the CURRENT codebase.

Read AGENTS.md first and preserve all settled decisions.

Do NOT perform another generic audit.
Do NOT redesign the brands from scratch.
Do NOT rebuild functionality that already exists.
Do NOT reopen settled homepage decisions.
Do NOT add features merely because competitors have them.

Implement the valuable remaining improvements while making the entire
White Glove ecosystem dramatically easier to use.

## PERMANENT BUSINESS RULE

WHITE GLOVE DOES NOT PROVIDE CUSTOM TRAVEL PLANNING.

Never imply that White Glove itself:
- plans a customer's trip
- provides a concierge
- creates a custom trip for someone
- assigns a travel advisor
- provides done-for-you planning

White Glove provides information and software.

White Glove Kosher Travel: DISCOVER & PLAN
White Glove Itineraries: BUILD, ORGANIZE & MANAGE

White Glove Itineraries is a GENERAL travel product.
Do not market Kosher Travel from the Itineraries product.

Kosher Travel may connect users onward to White Glove Itineraries.

Behind the products, preserve the intended shared account, subscription and
travel-database architecture.

## THE MOST IMPORTANT UX RULE

A powerful product must NOT feel complicated.

At every screen ask: WHAT IS THE MOST LIKELY THING THIS PERSON NEEDS TO DO RIGHT NOW?
Make that obvious.

Secondary actions should be quieter. Advanced controls should be progressively
disclosed. Internal terminology should stay internal.

Do not show 8 actions when 2-3 are enough.
Do not make people understand our database architecture.
Do not make people remember where functionality lives.
Do not use paragraphs when layout, labels, icons, grouping or hierarchy can
communicate the same thing.

Design for three very different people:

1. TRAVELER — "I need to find something or understand my trip immediately."
2. TRAVEL ADVISOR / PROFESSIONAL — "I need to manage many clients and trips without losing track of anything."
3. WHITE GLOVE ADMIN / OWNER — "I need to manage the entire business without remembering dozens of admin screens."

## PART A — WHITE GLOVE KOSHER TRAVEL

Do NOT redesign the settled homepage. Keep the existing search-first experience
and settled Featured structure. The improvement now is what happens AFTER the
visitor starts looking.

### A1. SEARCH SHOULD FEEL LIKE THE FRONT DOOR

Search should understand customer intent as much as reasonably possible.
Examples: "kosher food Miami", "mikvah London", "ski vacation", "JFK kosher
food", "shul near Times Square", "kevarim Poland".

Results should be grouped naturally when useful rather than looking like one
undifferentiated database dump. Useful result types may include: Destinations,
Kosher Food, Shuls, Mikvaos, Things to Do, Heritage, Accommodation, Current
Updates.

Do not create noisy result categories when there are no meaningful results.
Never confidently return an unrelated result merely to avoid saying nothing was
found. Preserve the recent search accuracy/performance improvements.

### A2. DESTINATION = THE CENTRAL HUB

A destination page should answer: WHAT DO I NEED IN THIS PLACE?

Where data exists, organize around: Overview, Kosher Food, Where to Stay,
Shuls / Minyanim, Mikvaos, Eruv, Zmanim, Shabbos information, Things to Do,
Heritage / Kevarim, Getting There, Transportation, Current Updates.

Do NOT make destination pages enormous again. Use jump navigation, compact
section previews, tabs/accordions where appropriate, "See all", progressive
disclosure. The most useful information comes first.

Do not explain our internal verification methodology in normal customer
language. Keep source/verification information internally and expose only
concise customer-appropriate trust/caution language where necessary.

### A3. SEASONAL DISCOVERY

Strengthen seasonal discovery using existing categories/content. Examples:
Pesach, Sukkos, Yeshiva Week, Summer, Winter / Ski.

Seasonal categories become more prominent when relevant. They should not
permanently consume prime homepage/navigation space. Do not create empty
categories. Do not invent programs, availability or dates.

Admin should be able to manage: season/category, active status, featured
status, applicable date window where appropriate.

### A4. KOSHER TRAVEL NOW / CURRENT UPDATES

Create a lightweight structured Updates system. This is NOT a giant blog.

Examples: new kosher restaurant, restaurant moved, restaurant temporarily
closed, temporary minyan, seasonal kosher program, Pesach/Sukkos information,
kosher airport update, temporary hotel program, time-sensitive destination
information.

An update may attach to: destination, listing, relevant category.

Useful fields: Title, Short description, Relationship, Start date, Expiration
date, Source/internal verification, Published status.

Expired temporary information should stop appearing publicly automatically. Do
not delete history unnecessarily. Only show "Current Updates" publicly when
relevant current information exists. Keep it visually compact.

### A5. NEARBY DISCOVERY — NOT JUST GPS

Create an excellent nearby experience. Allow "Use my location" OR search
around: City, Address, ZIP/postal code, Airport, Landmark. Examples: Near JFK
Airport, Near Times Square, Near Miami Beach.

Then: Kosher Food, Shuls, Mikvaos, Things to Do.

Do not require location permission.

Nearby result cards should prioritize: Name, Distance, One important detail,
Navigate, Add to itinerary / route where appropriate. Do not overload cards
with actions.

### A6. WHERE TO STAY — JEWISH PRACTICALITY

Make accommodation discovery genuinely useful to an Orthodox traveler.

Where REAL data exists, support factual attributes such as: kosher food nearby,
shul/minyan nearby, mikvah nearby, eruv information, walking practicality,
kitchen/self-catering, on-site kosher food, kosher breakfast, Shabbos meals,
Shabbos access/key information, Shabbos elevator.

NEVER infer these. Never call a normal hotel "kosher" merely because Jewish
resources are nearby.

The UX question is: WHICH PROPERTY OR AREA IS PRACTICAL FOR MY NEEDS? — not:
WHICH PROPERTY DOES WHITE GLOVE HALACHICALLY RECOMMEND?

Keep cards compact. Show only the most valuable confirmed attributes as small
chips/icons. Full details belong behind the listing/details view.

### A7. DISCOVERY -> TRIP

This is White Glove Kosher Travel's major advantage over a normal directory.

Make the flow feel natural: FIND -> ADD TO ITINERARY / ROUTE -> CONTINUE.

After adding something, show an unmistakable success state. Do not make users
wonder whether it worked. Do not surround Add with many competing actions.

## PART B — WHITE GLOVE ITINERARIES

The goal is NOT to become a giant generic CRM. White Glove should remain easier
than competitors.

The professional mental model should stay close to: CLIENTS -> TRIPS ->
ITINERARY -> DECISIONS -> MESSAGES -> DOCUMENTS -> PAYMENTS.

Most powerful professional functionality belongs after sign-in. Keep the public
product site simple.

### B1. ADVISOR HOME — "WHAT NEEDS ME?"

This is the biggest design improvement. The advisor dashboard should not
primarily be a collection of feature shortcuts. It should be a WORK QUEUE.

At a glance, the advisor should understand: WHAT NEEDS MY ATTENTION? WHAT IS
WAITING ON THE CLIENT? WHAT IS COMING UP? WHAT RECENTLY CHANGED?

Use existing data/statuses wherever possible. Useful sections may include:
Needs Attention, Upcoming Trips, Waiting on Client, Recent Messages / Activity.

Examples of Needs Attention: client selected hotel, traveler details completed,
payment overdue, import waiting for review, unread client message, document
requested, flight changed.

Do not invent meaningless analytics. Do not fill the dashboard with charts
merely because it is a dashboard. Action beats analytics.

Every item should take the advisor directly to the place where it can be
handled.

### B2. GLOBAL PROFESSIONAL SEARCH

An advisor should not need to remember which module something belongs to.

Create/preserve excellent global search across appropriate professional data:
Clients, Trips, Groups, Itineraries, Documents, Bookings.

Typing "Schwartz" should quickly surface the client and their relevant trips.
Typing "Italy" should surface relevant trips/groups. Typing a confirmation
number should surface the booking where feasible.

Search should be easy to access from the professional workspace.

### B3. CLIENT PAGE

A client record should feel like: EVERYTHING I NEED ABOUT THIS CLIENT.

At a glance: Contact, Upcoming trip, Past trips, Needs Attention, Messages,
Documents, Payments/status, Traveler information, Notes where appropriate.

Do not duplicate trip data into another CRM database. Reference existing
trip/client systems. The most important action is usually opening the active
trip.

### B4. TRIP WORKSPACE

When an advisor opens a trip, keep the main work together. Avoid making them
bounce through unrelated screens.

A trip workspace should make it easy to reach: Itinerary, Travelers, Decisions,
Messages, Documents, Payments, Trip settings/details.

Context should remain obvious: WHOSE TRIP AM I EDITING? Avoid excessive nested
navigation. Use sticky/contextual trip navigation where it improves usability.

### B5. REUSABLE LIBRARY

Implement/finish MY LIBRARY. Allow professional users to save reusable:
complete itinerary templates, individual days, hotels, activities, restaurants,
transfers, notes, arrival/departure instructions, frequently reused content.

Core actions: Search, Add, Edit, Duplicate, Delete, Use in Trip.

Inside itinerary building: ADD FROM LIBRARY. From useful existing content: SAVE
TO LIBRARY.

Using a template should copy it into the trip. Editing the copied trip must not
alter the original template.

Keep Library organization simple initially. Folders/categories/search are
enough. Do not build a marketplace now.

### B6. EMAIL / DOCUMENT -> ITINERARY

Build ONE import pipeline. Possible sources: forwarded email, pasted text, PDF,
screenshot/image, uploaded confirmation, future supplier API.

All sources should feed the SAME normalized Booking Draft architecture.

Example:

    BOOKING DRAFT
    Type: Flight
    Airline: United
    Flight: UA84
    EWR -> TLV
    Sep 14 - 5:45 PM
    Confirmation: ABC123
    [Edit] [Add to Trip]

Supported draft types should include: Flight, Hotel, Car, Transfer,
Activity/Reservation.

Never silently write AI-extracted data into the itinerary. Always review first.
Low-confidence or missing fields require confirmation. Never invent missing
information.

Design future supplier integrations to plug into this pipeline. Do NOT build
hundreds of supplier integrations now. If inbound email requires an external
provider, build what is reasonable internally and identify the required
external connection. Never fake inbound email.

### B7. NEEDS ATTENTION

Create one unified Needs Attention concept. Do not create multiple unrelated
task systems.

TRAVELER examples: choose hotel, complete traveler details, upload requested
document, payment due, read important update, flight changed.

ADVISOR examples: client made selection, form completed, payment outstanding,
new message, import awaiting review, decision outstanding.

Each item gets ONE obvious action. Examples: "Choose hotel [Review options]",
"$620 remaining [Pay]", "Traveler information [Complete]".

When resolved, the item disappears.

Do NOT make Needs Attention another permanent bottom tab in the traveler app.
Show it contextually when something actually requires attention.

### B8. OPTIONS / CLIENT DECISIONS

Professional user can present approximately 2-3 choices. Examples: Hotel,
Flight, Activity, Transfer.

Each option can include: Title, Image, Price, Short description, Important
details, Relevant link/document.

Client sees a clean MOBILE comparison. Primary action: SELECT.

After selection: record decision, show advisor, create Needs Attention where
appropriate, allow advisor to convert/add selected option into itinerary.

Do NOT automatically purchase anything. Selection is approval, not checkout.

The goal is to eliminate unnecessary email chains.

### B9. GROUP TRIPS

Implement Group Trips using existing trip/traveler/payment architecture. One
master group can contain multiple traveling parties.

Example:

    ITALY FAMILY TRIP — 24 travelers
    Schwartz Family — 5 travelers — Paid
    Weiss Family — 4 travelers — $1,200 due
    Klein Family — 6 travelers — Traveler information needed

Each party may have its own: travelers, primary contact, payment/share, payment
status, forms/information, private documents, messages where appropriate, Needs
Attention — while sharing the relevant master itinerary.

DO NOT duplicate the master itinerary for every family. Shared itinerary
changes should flow to relevant travelers.

PRIVATE PARTY DATA MUST NEVER LEAK BETWEEN PARTIES.

Advisor Group view should answer immediately: WHO HAS PAID? WHO OWES? WHO IS
MISSING INFORMATION? WHO NEEDS ATTENTION?

Do not build a giant tour-operator back office.

### B10. SPLIT PAYMENTS

Integrate the existing split-payment direction into trips/groups.

Show: Total, Paid, Remaining, and each payer's appropriate status. Each payer
gets their own secure payment action.

Never expose one payer's sensitive payment information to another traveler.
Never store raw card data. Do not create a disconnected payment subsystem.

### B11. FORMS

Keep forms intentionally simple initially. Focus on: Traveler Details, Travel
Documents where securely supported, Preferences, Custom Questions.

Do not build a giant form-builder product now.

If passport information cannot be stored safely with current architecture, do
NOT enable insecure passport storage merely to complete the feature. Clearly
identify required security work instead.

### B12. LIVE TRIP INTELLIGENCE

The Companion App should not be merely a static itinerary. Where REAL
operational data exists, surface useful changes.

Examples: "FLIGHT DELAYED — New departure: 8:42 PM", "GATE CHANGED — B16 ->
C4", "NEXT — Airport transfer".

The important improvement is context. If a flight is delayed and the next
itinerary item is an airport transfer, the traveler should still understand
that the transfer is the next relevant step.

Do not claim "Driver notified" unless a real integration confirms it. Do not
automatically change reservations without authority/integration. Never use fake
operational data on real trips.

If a live flight provider is required, prepare clean architecture/UI and
identify the required provider.

### B13. COMPANION APP DESIGN

Design for someone actually traveling with one hand on a phone.

The main mental model should remain extremely small: TRIP, MESSAGES, WALLET,
MORE. Do not keep adding bottom navigation items.

TRIP should prioritize TODAY. The traveler should immediately know: Where am I?
What happens next? What time? Where do I go? Did anything change?

Large touch targets. Times and locations visually stronger than descriptions.
Easy movement between days.

MESSAGES: only show genuine messaging.

WALLET: obvious home for flights, hotel confirmations, tickets, reservations,
confirmation numbers, documents.

MORE: secondary information only. Do not turn More into another giant
navigation tree.

Support offline access to essential itinerary/documents where current
architecture permits.

### B14. CLIENT-FACING INFORMATION CONTROL

The advisor should control what the traveler sees without deleting internal
information.

Where appropriate support: Visible to traveler, Advisor/internal only.

Examples: internal supplier notes, commission information, internal reminders,
draft options, cancelled/hidden items.

Do not make the advisor maintain duplicate versions of an itinerary. One
underlying trip, appropriate views.

## PART C — WHITE GLOVE ADMIN

Admin should feel like a CONTROL CENTER, not the database schema. The owner
should not need to remember 50 screen names.

### C1. ADMIN NAVIGATION

Keep all functionality, but reduce primary navigation complexity.

Use a mental model approximately like: DASHBOARD, NEEDS REVIEW, CONTENT, TRIPS
& USERS, ADVERTISING & EARNINGS, SETTINGS.

Specialist screens can live underneath these groups and remain reachable by
search.

Examples of things that should NOT all fight for top-level navigation:
airports, borders, hechsherim, mikvaos, eruvin, shuls, integrations, technical
settings, security, affiliate configuration, etc.

Do not delete them. Organize them.

### C2. ADMIN GLOBAL SEARCH / COMMAND ACCESS

This is extremely important. Admin search should allow me to type what I
remember, not where it lives.

Examples: "Miami" -> destination/listings/content. "Dinitz" -> kosher listing.
"Schwartz" -> user/trip where appropriate. "advertisement" -> ad management.
"Duffel" -> integration/settings. "mikvah" -> content section.

Results should clearly show WHAT the item is and WHERE it lives. Prefer fast
navigation over making me drill through menus.

If appropriate, provide quick actions from results: Edit, View, Open.

Do not make destructive actions available casually from search.

### C3. ADMIN DASHBOARD

Dashboard should answer: WHAT NEEDS ME TODAY?

Prioritize existing actionable information: Needs Review, suggested
corrections, imports waiting for review, messages requiring attention,
important incomplete content, recent/upcoming trips/users, advertising status,
affiliate/booking activity, integration failures.

Do not invent metrics. Do not add decorative charts without an operational
reason. Every dashboard item should be clickable to the exact place I handle
it.

### C4. ADMIN EDITING

Editing should be consistent across content types.

The mental model: FIND -> OPEN -> EDIT -> SAVE -> SUCCESS -> VIEW ON SITE.

Common customer-facing fields FIRST. Advanced/internal/source/technical fields
SECOND. Use sections with clear headings. Collapse advanced sections where
appropriate.

Make SAVE unmistakable. On long mobile forms, use a sticky Save action where
useful. After save, clearly confirm success. Provide View on Site when the
content has a public representation. Warn about unsaved changes before
accidental navigation where appropriate.

### C5. ADMIN LISTS

Every major admin collection should provide the relevant subset of: Search,
useful filters, Status, Sort, Add, Edit, Review state.

Do not display 15 columns simply because the database contains 15 fields.
Desktop tables should show decision-making information. Mobile should use
cards/stacked rows when a table becomes unusable.

No horizontal page scrolling on normal phone widths. Touch actions minimum
comfortable size.

### C6. NEEDS REVIEW

Make Needs Review one of the strongest admin workflows.

Combine or clearly surface actionable queues such as: suggested edits,
imported/unverified content, duplicate candidates, Current Updates awaiting
review, content problems.

For each item, make the decision obvious: WHAT CHANGED? WHAT IS CURRENT? WHAT
IS PROPOSED? WHAT IS THE SOURCE?

Then: Approve, Edit & Approve, Reject.

Do not make me open five screens merely to understand one correction. After
action, automatically move to the next relevant item where appropriate.

### C7. BULK ACTIONS — CAREFULLY

Where repetitive admin work genuinely benefits from bulk actions, support safe
actions such as: Publish, Unpublish, Assign category, Set season, Archive, Mark
reviewed.

Do NOT bulk-enable dangerous/destructive operations without confirmation. Do
not sacrifice accuracy for speed.

### C8. CURRENT UPDATES ADMIN

Provide an extremely easy way to create/manage temporary Kosher Travel updates.

I should be able to: Add update, Attach destination/listing, Set dates,
Publish, Expire.

Expired items should be obvious. Do not require editing raw structured data.

### C9. ADMIN MOBILE

Admin must genuinely work on a phone. Test approximately 320, 360, 390 and
430px.

No clipped titles, overlapping buttons, tiny action links, desktop tables
squeezed into phone width, horizontal page scrolling, or Save buttons only at
the top of a long form.

Primary actions should be easy to reach with a thumb.

## PART D — VISUAL DESIGN SYSTEM

Do NOT imitate competitors visually. Keep White Glove's premium identity: navy
/ gold / cream where applicable. Clean. Calm. Professional. High trust.

But make the UI hierarchy stronger.

### D1. ONE PRIMARY ACTION

Most screens/cards should have ONE visually dominant action. Examples: Search,
Add to itinerary, Open trip, Review, Save, Select, Pay.

Secondary actions should visually recede. Avoid rows of equally weighted
buttons.

### D2. REDUCE CARD CLUTTER

Cards should answer: WHAT IS THIS? WHY DO I CARE? WHAT CAN I DO? — not expose
every field and every action.

Use detail pages/drawers/progressive disclosure for the rest.

### D3. CONSISTENT STATUS LANGUAGE

Use a small, consistent status vocabulary. For professional/admin workflow,
concepts can include: Needs Attention, Waiting on Client, Waiting on Advisor,
Complete, Draft, Upcoming, Past.

Do not create several labels meaning nearly the same thing.

Customer-facing trust/status language should remain natural and not expose
internal verification workflow.

### D4. EMPTY STATES

Never let an empty screen feel broken. An empty state should explain what the
area is for and offer the ONE most useful next action.

Examples: "No trips yet. [Create trip]", "Nothing needs your attention. You're
caught up.", "No saved library items. [Save your first item]".

Keep empty-state text short.

### D5. FEEDBACK

Every important action needs immediate feedback. Examples: "Added to itinerary",
"Saved", "Payment received", "Selection sent", "Update published", "Import ready
for review".

For failures, explain what happened and what the user can do next. Never
silently fail.

### D6. MOBILE FIRST

Do not merely shrink desktop. On phone: prioritize content, stack
intelligently, use drawers/sheets where appropriate, keep primary actions
reachable, use large touch targets, avoid tiny inline links, avoid horizontally
scrolling interfaces unless the content genuinely requires it.

## PART E — ARCHITECTURE / REUSE

BEFORE implementing any item, inspect what already exists.

We already have substantial functionality around: Itineraries, Routes,
Companion App, Messages, Wallet/documents, Accounts, Business/advisor accounts,
Clients, Sharing/share codes, Payments, Split payments direction, Maps/location,
Kosher database, Destinations, Categories, Verification/source information,
Admin, Smart Import work, Library work, Forms work.

EXTEND THESE. DO NOT CREATE PARALLEL SYSTEMS.

Examples: one Needs Attention model, not three. One booking-import pipeline,
not separate PDF/email/supplier pipelines. One underlying itinerary with
visibility controls, not duplicate advisor/client itineraries. One client/trip
relationship, not a second CRM database. One payment architecture, not a
separate Group payment implementation.

## PART F — PERFORMANCE

Preserve the recent server-side search/list improvements. Do not regress by
shipping entire large directories to the browser.

Large collections should use appropriate server-side search, pagination / Show
more, lazy loading, server rendering where useful.

Do not sacrifice mobile performance to add richer UX.

## PART G — ACCESSIBILITY

As part of these UI changes: maintain proper labels, keyboard accessibility,
visible focus states, semantic controls, adequate contrast, meaningful error
messages, touch targets appropriate for mobile.

Icons should not be the ONLY indication of an unfamiliar action unless there is
an accessible label/tooltip.

## PART H — DO NOT BUILD

Do NOT: offer custom travel planning; build a giant Salesforce-style CRM; build
hundreds of supplier integrations now; build a marketplace now; build a giant
Typeform competitor; redesign the settled Kosher Travel homepage; add
unnecessary navigation; expose technical/database language; fake live flight
information; fake messaging; fake availability; infer kosher/Shabbos facts;
duplicate systems that already exist; add features solely to match competitor
checklists.

## PART I — PRIORITY

Do not attempt everything in random order. Prioritize changes that reduce user
effort.

Recommended order:

1. UX/navigation/hierarchy cleanup across Admin, Advisor workspace and Companion App
2. Admin command-center/search/editing improvements
3. Advisor dashboard + unified Needs Attention
4. Destination/Nearby/Where-to-Stay usability
5. Current/seasonal Kosher Travel information
6. Reusable Library
7. Unified Smart Import / Email -> Itinerary architecture
8. Options / Client Decisions
9. Group Trips + existing split-payment integration
10. Live Trip Intelligence
11. Remaining polish/accessibility/performance

If a later feature already substantially exists, polish/connect it instead of
rebuilding it.

## PART J — TEST THE EXPERIENCE, NOT JUST THE CODE

After implementation, test realistic workflows.

KOSHER TRAVELER: search "mikvah London" -> useful result -> destination/context
-> Navigate/Add to itinerary. Search around JFK -> kosher resources -> usable
without GPS. Find Miami accommodation -> understand practical Jewish resources
-> open details.

ADVISOR: open dashboard -> immediately know what needs attention -> open client
-> open active trip -> send options -> client selects -> selection appears ->
add selection to itinerary. Import confirmation -> review extraction -> add to
trip.

GROUP: open group -> immediately see who paid, who owes and who is missing
information.

TRAVELER APP: open during trip -> immediately see today/next -> retrieve
confirmation/document -> understand flight change -> complete outstanding
action.

ADMIN: open dashboard on phone -> see what needs attention -> search "Miami" ->
edit content -> save -> view on site. Review a suggested correction ->
understand change/source -> approve -> next item.

If these workflows feel complicated, simplify them before considering the work
finished.

## FINAL REPORT

Do the implementation. Do not respond with another giant recommendation
document.

When finished, report only:

1. White Glove Kosher Travel — what actually changed.
2. White Glove Itineraries / Advisor CRM — what actually changed.
3. Companion App — what actually changed.
4. Admin — what actually changed.
5. Existing systems reused.
6. External APIs/providers still required for real functionality.
7. Anything blocked by security/data requirements.
8. Maximum TWO decisions that genuinely require me.

Keep that report concise.
