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

## One name per thing

The site had several names for each of its own features, so four front doors looked like seven. Use the first column; the alternatives are fine inside a sentence where the context genuinely calls for one, and are not names.

| Use | Not |
| --- | --- |
| Where to stay (the section), places to stay (the things) | Hotels & Stays, stays, where to sleep |
| Itinerary planner | trip planner, My Trips, the planner |
| Kosher food finder (the live tool) | food finder, kosher lookup, live search |
| Listing (ours, with a source) / live result (from OpenStreetMap) | record, entry, our data |

The four ways into the site are named once in `lib/starting-points.ts` — get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`), have White Glove plan it (`/services`). Link to one of them through that list rather than inventing a label at the call site.
