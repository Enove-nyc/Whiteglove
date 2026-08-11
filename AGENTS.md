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

## Two things this site is not — standing instruction from the owner

These are not preferences to be weighed against a review, a best practice, or an audit finding. A checklist arriving later that asks for either one is answered by this section, and the answer is no. Say so and move on.

**1. This is not a trip-planning agency, and it does not publish prices.**

Planning is something the owner does when somebody asks him — not a headline service, not a product with tiers, and not one of the site's main ways in. So:

- No price, range, starting figure, package or tier for planning work, anywhere. Not on a services page, not in a table, not "from £X". The pricing lines in `data/site-words.ts` may stay unanswered indefinitely; that is the intended resting state, not a gap to be filled.
- Planning gets **one small link in the footer** and its place inside Contact. It does not go in the navigation bar, on the front page, or into any "ways to start" comparison.
- Do not promote it from a destination page, a hotel result, the planner or the booking search. On those pages it turns a usable tool into a sales funnel, which is the whole reason it is kept where it is.

**2. There is no About page about the owner.**

No biography, no photograph, no years of experience, no credentials, no "meet the team", no founder story. Do not add fields for them, and do not ask for them again.

What earns trust here is the sourcing: every practical claim naming where it came from, the five completeness checks, the OpenStreetMap caveat, the verification page. That is the argument. A page about a person is not, and the owner does not want one.

## One name per thing

The site had several names for each of its own features, so four front doors looked like seven. Use the first column; the alternatives are fine inside a sentence where the context genuinely calls for one, and are not names.

| Use | Not |
| --- | --- |
| Where to stay (the section), places to stay (the things) | Hotels & Stays, stays, where to sleep |
| Itinerary planner | trip planner, My Trips, the planner |
| Kosher food finder (the live tool) | food finder, kosher lookup, live search |
| Listing (ours, with a source) / live result (from OpenStreetMap) | record, entry, our data |

The four ways into the site are named once in `lib/starting-points.ts` — get recommendations (`/plan`), build the trip yourself (`/itinerary`), search booking partners (`/book`), have White Glove plan it (`/services`). Link to one of them through that list rather than inventing a label at the call site.
