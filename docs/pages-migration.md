# Making the public pages editable — the plan

## Where things stand

34 pages a visitor can reach. **Seven** of them have any editable text, and on
those seven only two fields are editable: the heading and the intro paragraph.
Everything else on every page is written into the `.tsx` file — the Services
cards, the Privacy and Terms text, the whole of Lizhensk *including the ohel
phone number and the hospital numbers*.

Editable text lives in the `Page` table: `slug`, `title`, `body`, `status`. The
body is plain text with light conventions (`## ` for a subheading, `- ` for a
bullet), rendered by `components/PageBody.tsx`.

## What has to change

A block editor needs the page to *be* a list of blocks. Today a page is a React
component with prose baked into it. So each page has to be re-expressed as data.

## The approach: additive, never destructive

**No existing content is deleted, and no page loses anything.** The rule
throughout:

> The hard-coded content stays in the repository as the page's **default**.
> The database holds an **override**. A page renders its override only when one
> has been published; otherwise it renders exactly what it renders today.

That gives three properties worth having:

1. **Nothing can break.** With no database, an unreachable database, or a page
   never edited, the public site is byte-for-byte what it is now. This is how
   `lib/pages.ts` already behaves and the same fail-safe carries over.
2. **Rollback is deleting a row.** If an edit goes wrong, removing the override
   restores the original — the original was never overwritten.
3. **Editing starts from the real page.** Opening a page in the editor shows
   the blocks that make up the page today, seeded from the defaults, not a
   blank screen.

## The schema change

`Page` gains **one nullable column**:

```prisma
blocks  Json?   // the block list, when the owner has edited this page
```

Nullable and additive. No column is dropped, no column is retyped, and every
existing row stays valid — `blocks` is simply null on all of them, which reads
as "not edited yet". `title`, `body` and `status` keep working exactly as they
do, so a page edited under the old editor keeps rendering while the new one is
being rolled out.

**Migration steps:**

1. `prisma migrate dev --name page-blocks` — adds one nullable column.
2. Deploy. Nothing changes for visitors: every `blocks` is null, so every page
   renders from code.
3. Pages become block-editable one registry entry at a time. A page not in the
   registry is untouched.

**To reverse:** stop reading `blocks`. The column can be left in place; it holds
only overrides, and the code defaults are still the source of truth for anything
never edited.

There is no destructive step anywhere in this, so there is nothing to schedule a
maintenance window for.

## The block types

Deliberately few. Every block maps to something the site already renders, so a
page built from blocks looks like the rest of the site rather than like a
generic page builder.

| Block | What it is | Fields |
|---|---|---|
| `hero` | The eyebrow, heading and intro at the top | eyebrow, heading, intro |
| `text` | A paragraph or several | heading (optional), body |
| `cards` | The 2–4 column card grids used across the site | heading, intro, items[{title, body}] |
| `list` | A checklist or bulleted list | heading, items[] |
| `image` | A picture with an optional caption | url, alt, caption |
| `buttons` | One or more call-to-action buttons | items[{label, href, style}] |
| `quote` | A pulled-out line | text, attribution |
| `note` | The bordered aside used for caveats | body, tone |

Every block also carries `id` and `hidden`, so a block can be turned off without
being deleted.

## Which pages

**In scope** — pages that are content:

`services`, `planning`, `honeymoon`, `getaways`, `phone-rentals`,
`travel-insurance`, `flight-booking-assistance` (the current seven), plus
`privacy`, `terms`, `contact`, `kosher`, `submit`, `book`, `booking`, `map`,
`travel-guide`, `lizensk`.

**Out of scope** — pages that are tools, where the words are labels on controls
rather than content, and a block editor would be the wrong shape:

`/itinerary`, `/itinerary/print`, `/account`, `/login`, `/my-route`,
`/booking/review`, `/access`, `/version`, `/stops`, `/directory`, `/cemeteries`
and the dynamic routes `/[city]`, `/cemeteries/[cemetery]`,
`/destinations/[place]`, `/i/[shareId]`, `/info/[slug]`. Those last ones are
already editable through the Directory, which is where they belong.

## Order of work

1. The block model, the renderer, and the fail-safe read layer.
2. The admin list — every page, searchable, with status and last-updated.
3. The block editor, with previews.
4. Convert pages to the registry, a few at a time, verifying each renders
   identically before and after.

Step 4 is where the risk is, and it is the step that can stop at any point
without leaving anything half-done: a page not yet converted simply keeps
rendering from code.
