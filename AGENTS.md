<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Customer-facing copy

- Write public copy in a natural, confident and concise voice suitable for an established travel website.
- Keep the site-wide under-production banner visible until the owner explicitly asks to remove it. The banner may be polished, but not deleted or hidden.
- Do not expose internal workflows or content status to customers. Avoid phrases such as “unverified,” “being checked,” “on record,” “research queue,” “not published yet,” or explanations that the owner has not completed something.
- Hide unfinished or empty public sections until they contain useful customer-ready content.
- Do not make blanket payment promises such as “no card taken” or “nothing charged.” State a price or payment step only when it is accurate and needed.
- Keep vacation discovery, self-service planning and partner booking links as the primary public journey. Heritage travel belongs in its own section.
- Personal planning or booking assistance should be discreet and discoverable only from the Contact area unless the owner requests otherwise.

## The paid planning service is a last resort, not an offer

**Done-for-you itinerary planning (`/services`) is the bottom option.** The owner does not want it promoted as one of the things this website sells. It stays reachable for somebody who asks for it and finds nothing else that fits — that is all.

What follows from that:

- Do not give it prominence: no homepage push, no cards selling it, no “or let us plan it for you” beside the free tools. Where it is mentioned at all, it comes last.
- **Do not ask the owner to price it.** No starting price, no typical range, no turnaround time, no “does the fee come off a booking”, no cancellation or refund terms, no post-itinerary support window. A page that would need one of those sentences should not be built. This is a standing answer, not an open question — do not re-raise it as an outstanding item.
- The free tools are the offer: get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`).

## Settled decisions — do not re-open these

- **The site notice stays exactly as it is**, a full-screen popup, until the owner says otherwise. He was shown the cost (it blocks every automated functional check and is the whole of the tab-order findings) and chose to keep it. Do not raise it again, and do not quietly turn it into a strip.
- **The About page carries no name and no background** — only where the business is based. Do not ask him for a biography, a photograph, or years of experience.

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
| Listing (ours, with a source) / live result (from OpenStreetMap) | record, entry, our data |

The four ways into the site are named once in `lib/starting-points.ts` — get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`), have White Glove plan it (`/services`). Link to one of them through that list rather than inventing a label at the call site.
