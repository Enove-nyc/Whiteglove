# Reply to the 28 August production review

Thank you — the process instructions are accepted and in force. This reply
covers what is now fixed, one finding that did not reproduce, and every item we
are **not** doing, with the reason. Please treat the last section as settled
rather than re-filing it.

---

## Fixed and deployed

**The Itineraries sitemap (item 2) — this was the big one and you were right.**
783 URLs, of which 760 were kosher pages the middleware immediately redirects
away from: 370 kevarim, 242 batei hachaim, 106 heritage towns, every
destination. It is now 9, verified end-to-end against a production build served
with the Itineraries `Host` — `/`, `/plan`, `/sample-itinerary`, `/book`,
`/about`, `/contact`, `/privacy`, `/pricing`, `/terms`.

The cause is worth recording because it explains item 1 as well. The list of
guide-only prefixes lived inside `middleware.ts`, where only the middleware
could read it, while the sitemap was built from a module shared with the kosher
repository. The router had known these were not ours since the split; nothing
connected that knowledge to the sitemap. Both now read one list.

**Legacy kosher URLs on the Itineraries domain now redirect permanently**
(308, was 307), and two gaps the move exposed are closed: the city guides
(`/uman`, `/belz`, `/lizhensk` — bare slugs at the root that no prefix rule
could catch, previously 404) and `/shabbos/[destination]`.

**Cross-brand language (item 3).** Fixed on `/plan` ("a school, a shul or a
simcha" → "friends, families, schools, teams or an organized group"), `/book`
("kosher needs" removed), `/login` ("Save kevarim" → general), and `/about`,
which was serving the kosher About page in full — minyanim, Shabbos, the kosher
food finder, and refusing to give a hechsher among the things the business will
not do. It now has its own.

One thing you could not have seen from the rendered page, and it matters for
your next pass: **`/plan` was wrong in the served HTML but right after
hydration.** The component asked a client-side hook for the brand, and that
hook's server fallback reads a build variable that is not set on that
deployment. So the markup a crawler and the first paint received said kosher.
The brand is now resolved from the request, server-side, before the HTML is
sent. **If you are diffing rendered DOM rather than served HTML, you will miss
this class of bug entirely** — worth checking both.

**Homepage links (item 12).** "See the app" now opens `/app/preview`; "Open
your inbox" goes to sign-in carrying its destination. Both previously pointed
at `/app`, which to a signed-out visitor is a code-entry and login door — two
of the three cards explaining the product opened onto a lock.

**`/app/preview` (item 13).** It now has a proper `h1` — it had none, so the
headings a screen reader was offered were the sample trip's days. Under it, in
words, the six things the phone is showing. Concierge was already gone from
this page before your review ran; the tab and both switches are removed for the
client preview.

**Kosher `/pricing`** described the wrong company: the sentence was built from
the reader's own brand, so on the kosher domain it read "White Glove Kosher
Travel is where you build a trip, hand it to the person taking it, and stay
with them while they travel." It now names White Glove Itineraries.

**Incomplete public wording (item 11).** Both examples fixed, and a test now
walks every public page for status talk so the rule is held site-wide rather
than at the two places it had leaked.

**Category treatments (item 6, second half).** The six front-page cards each
have their own mark on the site's navy, replacing the repeated aeroplane. Not
photographs — a stock stand-in claims to be somewhere and is worse than the
branded default it would replace.

---

## Item 1 did not reproduce

`/stops` **is** redirecting, and so is every other guide prefix. Tested with
`curl` following no redirects:

```
/stops         308 -> https://www.whiteglovekoshertravel.com/stops
/cemeteries    308 -> ...   /tzaddikim   308 -> ...   /kosher      308 -> ...
/hechsherim    308 -> ...   /mikvaos     308 -> ...   /zmanim      308 -> ...
/kosher-travel 308 -> ...   /heritage    308 -> ...
```

Your observation was real but the diagnosis was not: what you found was almost
certainly one of the paths that genuinely was **not** redirecting — the bare
city-guide slugs, or `/shabbos/*`, both of which fell through. Those are fixed.
For the next pass, please report the exact URL and the response status rather
than the rendered result — "renders the homepage with canonical `/`" and
"issues a 308" are distinguishable at the network layer and not always in the
browser.

---

## Not doing — settled decisions, not oversights

These four were put to the owner directly in earlier sessions, after he was
shown what each one costs. He confirmed them. They are recorded as settled in
the repository's own instructions, which say not to implement them from a fresh
audit. Please stop re-filing them.

**Item 4 — the hidden homepage headline.** The search-only hero is deliberate:
no headline, no eyebrow, no pitch paragraph, no browse links above the search.
The `h1` is `sr-only` on purpose so the page has one for search engines without
showing it. An outside audit recommended exactly your change before; he was
asked and said it stands.

**Item 5 — the blocking travel notice.** He was shown the cost — it blocks
every automated functional check and is the whole of the tab-order findings —
and chose to keep it as a full-screen popup. It is not to be quietly turned
into a strip.

**Item 6, first half — "Featured" → "Explore".** Featured is the six main
sections of the site, and that is the point: it was destinations once and he
asked for the shape of the site instead. A previous audit recommended replacing
it with a "Popular now" list; he declined. The imagery half of your item is
done, as above.

**Item 7's "Explore" rename** rests on the same decision.

If he has changed his mind on any of these he will say so and we will implement
them the same day. They are not open questions for an audit to answer.

---

## Not doing — with a reason other than a settled decision

**Kosher `/pricing` and `/sample-itinerary` → permanent redirects to
Itineraries.** We fixed the wording instead. Redirecting deletes two working
pages from the kosher domain, and `/sample-itinerary` in particular is the one
page that shows what the free planner produces — it is linked from the planner
itself and is in the kosher sitemap. A cross-domain 308 on a page that is
legitimately about both products costs more than the ambiguity it removes.
If the owner wants those pages to exist only on the Itineraries domain, that is
a product decision and he will make it.

**Item 12's audience switcher and first-viewport product proof.** Real work,
correctly identified, not started. It needs screenshots or a live embed of the
planner, which is a design task rather than a copy fix.

**Item 15 — the authenticated workspace and admin.** Accepted in full,
including that we must not describe these as audited until they are opened with
synthetic data. They have not been. Nothing in this reply makes any claim about
advisor, client or admin behaviour.

**Item 16's competitor inventory.** The "check what already exists before
building" instruction is right and we have been following it. Several things on
your list already exist (templates and content library, proposals and client
approvals, offline documents, flight updates, traveller permissions,
per-traveller redaction, group payments). We are not adding second
implementations.

---

## Second pass — the rest of the list

**Item 9, card contents.** A things-to-do card carried nine controls at once
and a places-to-stay card eight, on every one of several hundred cards.
Measured at 390px: nine visible controls on the first card, now two. The thing
the card is about and the buttons that put it on a trip stay in front;
everything else is behind one native `<details>`, still in the HTML.

Your destination-tile finding was right and was about the accessibility text,
not the visible text — worth saying because it took a second look to see. The
visible tile was already name, region, two chips, one action, exactly your
target. But each chip hid its own label from assistive technology and put the
full sentence in an `sr-only` span, so a screen reader got 285 characters per
tile across 156 tiles while a sighted reader got six words. The two audiences
were handed different cards and the one that could not see it got the longer
one. The chip announces its label now; the detail is on the destination page,
shown in full.

**Item 9, filters in the URL.** Four of the six directories did not do this.
`/tzaddikim`, `/hechsherim` and `/kosher` now do, through the same hook the
other two already used. Confirmed in a browser: typing puts `?q=` in the
address and reloading restores it. `/cemeteries` is left alone — it pages from
its own API and already takes its country from the URL server-side, and a
second mechanism writing one address is worse than the gap.

**Item 10.** All eight detail-page actions sat in one row at equal weight, with
Add to itinerary — the action the whole planner is built on — seventh of eight,
after Share. Three in front now, the rest one press away with their names and
behaviour unchanged. The "On this page" nav is pinned on desktop; confirmed
after 2,500px of scroll it sits at 64, the header's scrolled height. Not pinned
on a phone, where it is a wrapping row of nine links.

The Rome hero's "large unused space" is two things. The short panels stretching
to match the tall ones was real and is fixed. The blank to the right of the
overview paragraph is not: that is a measure, and a line of body text running
the full width of a 1280px page is harder to read, not better used.

**Item 11, gear wording.** The shelf is owner-entered data, not repository
content, so the site does not rewrite a supplier's product title on his behalf
— the one thing worse than a typo in a product name is a correction that makes
it the wrong product. Instead the admin now says what it sees, on the row he is
already looking at: likely typos including the one you found, titles ending on
a separator, descriptions cut off where the source truncated them, and one word
spelled two ways across the shelf. None of it blocks a save.

**Item 12, audience choice.** Done. One question, two answers; the headline, the
supporting line and the first button follow it. The brand, navigation and
everything below the hero do not move. The adviser is the server-rendered
default. Radios in a fieldset, so a screen reader is told it is a choice and
which one is made.

**Item 14 — measured, and mostly already true.** At 360, 390, 430, 768 and
1280, across the home page, a directory and a destination: no sideways
scrolling at any width, four persistent bottom actions against your limit of
five, the floating Ask button clearing the bottom bar by fifteen pixels rather
than covering it, and every touch target at or above 44px — except one, the
"Destinations" breadcrumb at 122x14, which is fixed. The remaining part of your
item is the judgement about competing navigation systems, which overlaps two
settled decisions and is not something to change from an audit line.

## Still open, and genuinely ours

**Item 9 — directory lengths.** Lengths partly done and measurably so, on mobile at
390px: `/tzaddikim` 70,685 → 20,311, `/destinations` 53,418 → 10,042,
`/hechsherim` 39,211 → 7,176, with every detail link still in the HTML (hidden
in CSS, not dropped, so nothing stops being crawlable and nothing enters the
keyboard order until expanded). `/hechsherim` also gained the search it never
had — the page whose entire job is looking up an unfamiliar mark had 287
agencies under 81 region headings and no search box.

**And then we measured desktop, and you were right the second time too.** The
cap had been written into a `max-width: 640px` block, so it had never once
applied above 641px. Every mobile figure we verified and reported was real;
every desktop page was untouched. At 1280, before the fix: /tzaddikim 28,702
against your 28,144, /hechsherim 23,915 against 23,683, /destinations 18,256
against 18,132 — within two percent of the pages as they were before any of the
work. You re-measured, got your own numbers back, and that was the correct
result.

Moved out of the media query, at 1280: /tzaddikim 9,773 (−65%), /hechsherim
4,505 (−81%), /destinations 3,699 (−80%), /mikvaos 6,696 (−28%), /things-to-do
6,857 (−18%), /hotels 15,412 (−9%). Every link still in the markup, no sideways
scroll at any width, mobile unchanged.

/hotels is the one still standing at 15,412. It pages from its own API at 24
rows and its cards are tall — a page size and a card problem rather than a cap
problem, and not fixed.

Two things worth taking from that for your side of this: a fix verified only at
the width it happens to work at is not verified, and a report that re-measures
the same numbers back is doing its job. Please keep stating the viewport.

**Item 8 — the homepage AI section.** Not removing it, and this belongs with
the settled decisions above: it was kept off the front page once and the owner
asked for it back, displayed and labelled as AI. The persistent control already
carries the three disclosures you list. The other half of your item — the
floating button covering navigation — did not reproduce: measured on mobile it
clears the bottom bar and covers nothing.

**Item 12's visual product proof.** Not done. It needs real screenshots of the
planner and the client app, which is an asset task rather than a copy fix, and
a committed screenshot goes stale silently.

**Item 16's competitor work.** Not started, beyond the inventory instruction,
which we were already following.

---

## One request for the next pass

Please give, for each finding: the exact URL, the viewport, the response status
where routing is involved, and whether you are reading served HTML or rendered
DOM. Three of the findings across your two reports turned on that distinction —
the `alt` attributes inside `aria-hidden`, the empty headings, and `/stops` —
and in each case the underlying page was doing something different from what
the report described.
