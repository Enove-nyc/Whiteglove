<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Customer-facing copy

- **Provide information, not hashkafa.** Describe what a place is and what visiting involves; leave the paskening to the traveler and their rov. Do not tell a customer whether to go, do not write "ask your rov," and do not frame an attraction as a choice to make carefully. A church, a museum of religious art, a gallery with nudes — say plainly what it is and stop there. What the site *lists at all* is still a selection decision (no nightlife, bars, mixed concerts, casinos — see below); how it *describes* what it lists is information only. This is a standing general rule, not specific to any one place.
- Write public copy in a natural, confident and concise voice suitable for an established travel website.
- Keep the site-wide under-production banner visible until the owner explicitly asks to remove it. The banner may be polished, but not deleted or hidden.
- Do not expose internal workflows or content status to customers. Avoid phrases such as “unverified,” “being checked,” “on record,” “research queue,” “not published yet,” or explanations that the owner has not completed something.
- Hide unfinished or empty public sections until they contain useful customer-ready content.
- Do not make blanket payment promises such as “no card taken” or “nothing charged.” State a price or payment step only when it is accurate and needed.
- Keep vacation discovery, self-service planning and partner booking links as the primary public journey. Heritage places are part of the normal destination directory, not a separate section (see "Personal trip planning has been removed" below for when this changed and why).
- There is no personal trip-planning or booking-assistance offer anywhere on the site, discreet or otherwise — see "Personal trip planning has been removed" below.
- Audience-appropriate is not the same as kosher-only. Vacation attractions and lodging do not have to be Jewish places or kosher establishments; prefer Jewish when it fits, and keep ordinary sightseeing and stays that Orthodox / Torah-observant travelers would use. Never promote nightlife, clubs, mixed concerts, or similar venues. Reserve “kosher” for food / kashrus features — do not demand a kosher label on every attraction, hotel, cemetery, shul or mikvah. Do not blur this into the kosher food finder or the heritage section. Public wording for this standard lives in `data/listing-audience.ts` (footer, About, Where to stay) — reuse it; do not invent a second version. It was taken off Things to do at the owner's word; do not put it back there.

## Personal trip planning has been removed

**Done-for-you itinerary planning (`/services`) does not exist on this site.** It used to be kept as a reachable last resort — mentioned last, never promoted — and the owner then decided to remove it outright rather than keep it available: no page, no nav entry, no footer link, no form, no mention anywhere, not even discreetly through Contact.

What follows from that:

- Do not re-add `/services`, a services page, a "have us plan it" card, or any wording that offers personal planning or booking assistance, in any form or at any prominence. This is a full removal, not a demotion — do not partially restore it as "just a footer link" or "just reachable from Contact."
- **Never ask the owner to price it.** No starting price, no typical range, no turnaround time, no "does the fee come off a booking", no cancellation or refund terms, no post-itinerary support window. There is nothing on this site to price. This is a standing answer, not an open question — do not re-raise it as an outstanding item.
- The three free tools are the whole offer: get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`).

## Settled decisions — do not re-open these

This section is the memory that carries across chats. It is loaded at the start of every session, so a decision recorded here is not re-litigated in a later one. When the owner settles something — a decision or a standing preference — write it here in plain terms, in his words where they are clear, so the next chat starts already knowing it and he does not have to say it twice.

- **The site notice stays exactly as it is**, a full-screen popup, until the owner says otherwise. He was shown the cost (it blocks every automated functional check and is the whole of the tab-order findings) and chose to keep it. Do not raise it again, and do not quietly turn it into a strip.
- **The About page carries no personal facts at all** — no name, no background, no photograph, no years of experience, and no location. White Glove is not based anywhere: it is a website. Do not ask him for any of them, and do not treat the empty fields on `/admin/settings/about` as gaps. The page is finished as it stands: what the site is for, and what its information is worth.
- **Vacation attractions need not be Jewish or kosher.** Audience-appropriate ≠ kosher-only. A Jewish venue is better when available, but general sightseeing, parks, museums, family activities and ordinary lodging are fine when Orthodox / Torah-observant travelers would go. No mixed concerts, clubs, nightlife, bars, casinos, or similar. Do not require a kosher label on attractions, lodging, cemeteries, shuls or mikvaos — “kosher” is for food / kashrus features. Kosher food tools stay kosher-specific. Customer-facing copy is in `data/listing-audience.ts` and must stay consistent with this.
- **Heritage is not a separate top-level section any more.** Heritage destinations (towns, kevarim, cemeteries) are part of the normal destination directory, reached the same way any other destination is; practical heritage information (kevarim, cemeteries, shuls) is reached through Kosher. The heritage pages themselves still exist and stay reachable — only the standalone "Heritage" category is gone. Do not reintroduce Heritage as its own top-level nav item or reopen the old "vacation vs. heritage" split without the owner asking for it.
- **Ratings ask about White Glove, not the trip.** White Glove does not arrange anyone's trip, so it never asks a traveler how the trip itself turned out. The trip rating asks only how White Glove did during the trip — how the site and its information held up. A listing rating stays about the place. Do not reword these to report on the trip's outcome.
- **Sources live on one `/sources` page, never on the listings.** A listing shows no source line at all — not even small print — because a source shown beside a listing, a kever especially, reads as an endorsement of whatever it points at. Every source the site cites is credited once on `/sources`, grouped and framed as acknowledgement rather than endorsement, and linked quietly from the footer. That page is generated from the data by `scripts/build-sources-index.mjs` into `data/sources-index.generated.ts` — rebuild it after source data changes, do not hand-edit it. The one exception is the heritage-cemetery page (`/cemeteries/heritage/[slug]`), which holds no details of its own and keeps its normal "See the details on Nesiya Tova" button. Do not put source links back onto individual listings.

## Do not hand the owner checklists

Report what changed and what it cost him, in prose. Do not produce checklists, audit tables, or lists of outstanding items for him to work through, and do not convert a question he asked into a list of tasks for him. If something genuinely needs a decision only he can make, ask that one question on its own.

## Working with the owner

**"Step by step" means one step, then stop.** Give a single step, wait for him to say done, and only then give the next one. Do not send a numbered list of five and call it step by step — he is working through these in his own dashboards, and the next step is useless until the one before it is done.

Say what the step is, where to do it, and how he will know it worked. Nothing else.

## One name per thing

The site had several names for each of its own features, so four front doors looked like seven. Use the first column; the alternatives are fine inside a sentence where the context genuinely calls for one, and are not names.

| Use | Not |
| --- | --- |
| Where to stay (the section), places to stay (the things) | Hotels & Stays, stays, where to sleep |
| Itinerary planner | trip planner, My Trips, the planner |
| Kosher food finder (the live tool) | food finder, kosher lookup, live search |
| Listing (White Glove’s curated listing, with a source) | record, entry, our data |

The three ways into the site are named once in `lib/starting-points.ts` — get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`). Link to one of them through that list rather than inventing a label at the call site.
