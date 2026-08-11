# Growing the vacation list

## The problem, stated properly

The original list had eighteen destinations, fifteen of them European cities,
and just one beach option. The first South Florida batch adds Miami Beach and
Hollywood/Hallandale, bringing the beach category to three real destinations.
The remaining gap is depth: a traveler looking for Florida, a Pesach programme,
or a school-holiday trip still needs more than a card with a name on it.

The obvious fix is to write twenty more destination records. It is the wrong
fix, and understanding why is the whole of this plan.

## Why a destination record is the last twenty minutes, not the work

Everything practical on a destination page is **derived**. `lib/vacation-ideas.ts`
computes the kosher answer and the Shabbos answer from records the site already
holds:

| What the page says | Where it comes from |
|---|---|
| Kosher food in town | `data/kosher-eateries.ts`, `kosherAreas` in `data/kosher-stays.ts` |
| Walkable quarter | a `kosherArea` with a **published shul coordinate** |
| Seasonal programme | a `kosherStay` with its `season` filled in |
| Bring it in from a base | the destination's `kosherBase`, joined against the same files |
| Where to stay | `kosherStays` joined on the city name |
| Things to do | `data/attractions.ts`, joined on the city name |

`data/vacation-destinations.ts` asserts none of it. A record whose `cities`
join to nothing renders a page of honest empty states — truthful, and useless.
Twenty of those would make the site look bigger and be worth less, on a site
whose only real argument is that what it prints has been checked.

**So the unit of work is evidence, not prose.** Gather the eateries, the
quarters with their coordinates, the stays with their kashrus claim and their
season, and the attractions with their Shabbos notes. The destination record is
then twenty minutes of editorial on top of it.

## The bar

Five checks, in `lib/destination-readiness.ts`, answered from the data itself:

1. **Kosher food** — something on record in the destination, or in a named base town.
2. **Shabbos** — a quarter, a seasonal programme, or a base town. Not an impression.
3. **Somewhere to stay** — a stay or a quarter **in the destination itself**. A base town does not answer where you sleep.
4. **Something to do** — at least one attraction. A place with food and nothing to do is a place to eat.
5. **Getting there and around** — a transport note that names the airport and says what you need once you land.

Every check is "is there anything here at all", deliberately. A threshold
anybody can argue about is a threshold that gets argued down on a busy
afternoon; two listings is not a rich destination page, but zero is not a
destination page.

`npm run audit:pipeline` prints the state of all three things: what is
published and whether it clears the bar, where the list is thin, and what is
queued. It exits non-zero if a published destination is below the bar.

## The queue

`data/vacation-pipeline.ts`. Fourteen candidates across the ten groups that were
asked for. Each one carries the towns it would join against — agreed **before**
the research starts, because the commonest way a destination page comes out
empty is a city spelled one way in `data/attractions.ts` and another in the
destination record — and the specific evidence still missing, each line naming
the file it lands in.

Order, and why:

The first publishable batch is **South Florida**: Miami Beach, then Hollywood
and Hallandale. It is deliberately only two destinations, with
official city, attraction, community and kashrus-certifier sources recorded
against the supporting listings.

The second publishable batch is **Orlando**: one park-region destination with
official attraction sources, a published community anchor and local food
directory listings. The practical question is not whether there is enough to
do; it is how to make the park districts, food and Shabbos base work as one
trip.

The remaining order is:

1. **New York getaways** (the Catskills, the Hudson Valley) — a drive rather than a flight. Different trip, most often taken.
2. **Los Angeles** — the west-coast counterpart, with a walkable quarter and a coast.
3. **Israel beyond Jerusalem** (Netanya, Eilat, the Kinneret and the Galil, the Dead Sea) — the site has one Israeli destination and it is a pilgrimage rather than a holiday.
4. **Caribbean and Mexico** — where a kosher beach holiday actually happens in winter, and almost always as a seasonal programme.
5. **Mediterranean beaches** (the Greek islands, the Costa del Sol) — the site's Mediterranean coverage is cities.
6. **Winter and ski** (St. Moritz and the Engadin) — the four alpine records here are written for summer walking.
7. **Seasonal kosher programmes** — a category rather than a place; see below.
8. **Domestic weekends** (the Berkshires and southern Vermont) — the shortest trip the site can be useful about.

## Two categories the site does not have yet

`ski` and `seasonal-programme`. Neither is added to `TRIP_THEMES` until **three**
destinations sit behind it (`NEW_THEME_THRESHOLD`). The hub already refuses to
render a filter with nothing behind it, and the front page stopped printing
counts because "Beach and resort · 1" says more about how far this section has
got than about the holiday. One destination behind a new category is the same
problem wearing a new label.

## Seasonal programmes are a data shape, not a page

The site already models the thing that matters: a `kosherStay` carries a
`season`, and `shabbosPracticality()` reports "Seasonal kosher programme —
turning up outside it gets you a room and nothing to eat". That sentence is
worth more than a programme directory, and it is the reason a programme must
never be recorded without its season. A programme entered with the season left
blank reads as year-round provision, and the failure mode is a family arriving
in November to a summer kitchen.

## What we will not do to make the list longer

- No destination published below the bar.
- No kashrus claim that a certifying body has not made. Researched-from-a-directory is never published as certified (`data/kosher-eateries.ts`).
- No coordinate nobody has stood at; an approximate quarter anchor is worse than none, because the whole Shabbos answer is measured from it.
- No opening hours and no prices, anywhere, for the reason on `/verification`.
- No stock photograph of a place, for the reason in `components/VacationCard.tsx`.

A candidate that turns out to have too little behind it stays in
`data/vacation-pipeline.ts`. That is a successful outcome of the research, not a
failed one.

## Known thin spot

`jungfrau-region` clears four of the five checks: it has no stay and no quarter
in the destination itself and leans entirely on its Zurich base. It is listed in
`tests/vacation-pipeline.test.ts` as a named exception so it stays visible, and
it comes off that list the day a stay in Interlaken, Grindelwald or Wengen is on
record.
