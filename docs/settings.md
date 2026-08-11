# Settings

Every environment variable the site reads, what it changes, and what happens if
it is missing. Set them in the Vercel project (Settings → Environment
Variables); nothing here needs a code change.

Anything marked **optional** has a working fallback — the site does not break
without it, it just does less.

## Driving times in the planner

| Variable | What it does |
| --- | --- |
| `GOOGLE_MAPS_API_KEY` | **Optional, but this is the one that matters for accurate days.** With it set, `/api/route-times` asks the Google Routes API with `routingPreference: TRAFFIC_AWARE` and a departure time — the same predictive-traffic model Google Maps uses — so the planner shows the number a traveler would get by typing the route into Maps. |
| `OSRM_ROUTER_URL` | Optional. Where to reach OSRM, the fallback router used when there is no Google key. Defaults to the public demo server, which is fair-use only and has no uptime promise — point this at a self-hosted instance if the planner is busy. |
| `GOOGLE_ROUTES_URL` | Testing seam only. Leave unset in production. |

## The map

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Enables Google Maps for White Glove's curated markers. Without it, or if Google's script cannot be reached, visitors see an accessible map-unavailable state with a link to continue discovery. |

**This must be a different key from `GOOGLE_MAPS_API_KEY`.** The Maps
JavaScript API runs in the browser, so its key goes out in the page and cannot
be hidden; that is normal, and Google's own answer is restriction rather than
secrecy. `GOOGLE_MAPS_API_KEY` is a server-only key with Routes API access and
must never be used here — anyone opening the page source would have it.

To set it up: in the Google Cloud console enable the **Maps JavaScript API**,
create a **second** key, and restrict it to that one API and to your own
hostnames (`whitegloveitineraries.com`, `*.whitegloveitineraries.com`, and your
Vercel preview domain). Then set the variable and redeploy —
`NEXT_PUBLIC_` variables are read at build time, so a redeploy is required.

Note that the Maps JavaScript API bills separately from the Routes API, and
every map load counts.

Without a Google key the planner falls back to OSRM, which routes on speed
limits and assumes empty roads, so its times run short. Without either, it uses
its own straight-line estimate. **All three are labelled differently in the UI**
— "Google Maps", "road routing, no traffic", "estimate" — so a traveler is never
shown a guess dressed up as a Maps time.

To get the key: Google Cloud console → enable the **Routes API** → create an API
key → restrict it to the Routes API. Billing must be enabled; Google's free
monthly credit covers a small site comfortably. Answers are cached for six hours
per leg, so re-planning the same trip does not re-bill it.

## Access control

| Variable | What it does |
| --- | --- |
| `SITE_ACCESS_PASSWORD` | The **full** code on the whole site: type it once and stay in. Both site codes can also be changed from **Settings → Passwords**, which takes priority over these variables **in production**. On `next dev`, the env value is still accepted even when Redis has a stored override, so localhost can use `.env.local` while sharing Upstash with production. Restart `next dev` after changing `.env.local`. |
| `SITE_PREVIEW_PASSWORD` | The **five-minute** code — for handing to somebody who needs to look at one thing. Access stops five minutes after they use it. The expiry is signed into the cookie and checked on every request, so it cannot be kept by copying the cookie or editing its lifetime. Must be a different word from `SITE_ACCESS_PASSWORD`. Same production-vs-local rule as the full code. |
| `SITE_LOCK_ENABLED` | Whether the lock is on at all. |
| `SITE_OPEN_HOSTS` | Comma-separated hostnames that skip the password entirely, e.g. `preview.whitegloveitineraries.com`. Lets one hostname stay open for reviewers while the main domain stays private. Case, port and a `www.` prefix are ignored. |
| `SITE_PREVIEW_TOKEN` | At least 12 characters. Anyone opening `?preview=<token>` gets in for 30 days without being told the password, and the token is stripped from the URL straight away. Change it to revoke every outstanding link at once. Never works on `/admin`. |
| `ADMIN_PASSWORD` | The admin dashboard password. |
| `ADMIN_HOST` | Optional. A hostname that serves the admin area on its own, e.g. `admin.whitegloveitineraries.com`. On that hostname every path is an admin path — `/` is the dashboard, `/shomrim` is the shomer screen — and the `/admin/…` paths keep working there too, so no saved link breaks. The hostname is never indexed. Unset by default, and with it unset nothing changes. **Add the domain in Vercel and point the DNS first**; the variable does nothing until the hostname actually reaches the site. |
| `ADMIN_HOST_ONLY` | Optional, `1` to turn on. Sends `/admin/…` on the main domain to `ADMIN_HOST`, so there is one place to sign in. Leave it off until you have opened the admin hostname and signed in there successfully — switching it on before DNS resolves leaves no way into the admin area at all. |
| `WHITE_GLOVE_SESSION_SECRET` | Signs the access and admin cookies. Changing it signs everybody out. |

**Letting somebody in without a code at all.** Add them on **Settings → People
with access** and they get in by signing in to their own account. Nothing is
shared, and taking it back from the same screen does not change anybody else's
code.

**Signing everybody out.** **Settings → Website access** has a button that
revokes every cookie at once — every code already handed out stops working and
anyone still on the site has to enter one again. It does not change the codes
themselves; do that on the Passwords screen if somebody has one they should not.

**Who has been in.** The same screen lists recent sign-ins: when, how they got
in, and roughly where from (country and town, out of the CDN's own headers).
The address is stored without its last part — `203.0.x.x` — so one visitor can
be told from another without the site keeping a record of anybody's connection.
Both the log and the revoke need Upstash Redis connected; without it nothing is
recorded, and the screen says so rather than showing an empty list.

## Email (Resend)

| Variable | What it does |
| --- | --- |
| `RESEND_API_KEY` | Required for any mail to send at all. |
| `RESEND_FROM_EMAIL` | The sender. **Until this is a verified domain sender, Resend's sandbox will only deliver to the address that owns the Resend account** — which is the usual reason mail to `contact@` never arrives. Verify the domain in Resend, then set this to e.g. `White Glove <no-reply@whitegloveitineraries.com>`. |
| `OWNER_NOTIFICATION_EMAIL` | Where edit suggestions go. Defaults to `edits@whitegloveitineraries.com`. |
| `CONTACT_NOTIFICATION_EMAIL` | Where contact-form messages go. Defaults to `contact@whitegloveitineraries.com`. |

The admin dashboard has a diagnostic panel that sends a test message to either
inbox and reports exactly what Resend said, including the sandbox restriction.

## Text messages (Twilio)

Signing up with a phone number instead of an email address. The verification
code goes by text to whichever the person used; with none of this set, the
sign-up form asks for an email only and never offers a choice it cannot honour.

| Variable | What it does |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | The Twilio account. Required. |
| `TWILIO_AUTH_TOKEN` | Its auth token. Required. |
| `TWILIO_FROM_NUMBER` | The number texts come from, in E.164 (`+15551234567`). Either this or a messaging service is required. |
| `TWILIO_MESSAGING_SERVICE_SID` | A Twilio messaging service, instead of a single from-number. |
| `DEFAULT_PHONE_COUNTRY` | Calling code assumed for a number typed without one — `1` unless set. A ten-digit number is read as this country; anyone can always type the `+` themselves. |

Two things to know before switching it on. **Texting US mobiles requires A2P
10DLC registration first** — Twilio runs it as an application and it takes days,
not minutes; until it clears, messages to US numbers are rejected. And **each
text costs money**, unlike email.

Sent codes are written to the same delivery log as the emails, so a text that
never arrived shows up on the Connections screen with whatever Twilio said.

An account is stored under whichever identifier it was made with, so
`(555) 123-4567` and `+1 555 123 4567` are the same account, not two. Somebody
who signs up by phone can still be added to a shared trip; they just do not get
the "somebody shared a trip with you" message, because a share link is not worth
a text — the trip is waiting when they next sign in.

## Booking partners

| Variable | What it does |
| --- | --- |
| `BOOKING_AFFILIATE_ID` | Booking.com affiliate ID. Hotel searches carry it once set. |
| `KAYAK_AFFILIATE_PARAMS` | Query string appended to Kayak links. |
| `TRAVELPAYOUTS_MARKER` | Travelpayouts marker — one free account covering flights, hotels and insurance. |

All optional: without them the Book page still works, the links just carry no
tracking and earn nothing.

## Services that are not open yet

| Variable | What it does |
| --- | --- |
| `TRIP_ARRANGEMENT` | Set to `1` when the concierge side is ready to take requests. Until then the flight-booking request form (and any trip-planning enquiry form) is visible but disabled, says **Coming soon**, and points people at the contact email. Off by default, on purpose: a deployment that forgets to set it shows "coming soon" to somebody who could have emailed, where the other way round means requests arriving that nobody answers. The pages' own words are unchanged — the service is real, it just is not open. |

The general contact form on `/contact` and the directory submission forms are
not affected and keep working.

| Variable | What it does |
| --- | --- |
| `DIRECTORY_FEATURED_NOTE` | What "★ Featured" means in the provider directory, in your own words — printed above the listings and on the badge. There is **always** a disclosure: without this, a default is used that makes no claim about payment either way (`Featured listings appear first in their category. Check each provider's details with them directly before booking.`). Set this to the real answer once there is one — `Featured providers pay for placement.` or `Featured providers are ones we have worked with directly. Nobody pays for placement.` A visitor cannot tell which is true, and only you know. Read at build time, so it takes a redeploy. |

## Storage and services

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | Postgres, via Prisma — the directory content. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Accounts, itineraries, share links, ads, analytics, media. |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | The travel assistant. Without either it says it is unavailable rather than guessing. |
| `AERODATABOX_API_KEY` | **Turns on "look up by flight number" in the planner.** From RapidAPI. Without it the box is still there and answers "Flight lookup is off", and everything is typed by hand. It reports one leg at a time, so a connecting flight comes back as two separate numbers. The free tier is small, so a busy minute can come back rate-limited. |
| `DUFFEL_ACCESS_TOKEN` | Flight data provider. Optional. With it set (and no Kayak affiliate key), flights are searched and booked on `/book` itself instead of being handed to Kayak. |
| `DUFFEL_STAYS` | Set to `1` once Duffel has approved Stays on the account. Hotels then search in-site too. The token alone is not enough — Stays is approved separately, and until it is the search 403s, so hotels go to Booking.com by default. |
| `NEXT_PUBLIC_SITE_URL` | **Set this before launch.** Absolute base URL, used in shared itinerary links and emails, and as the canonical URL and social-card base for every page. City guides and cemetery pages are statically generated, so they resolve it **at build time** — build without it and they ship with a relative canonical and an `og:image` pointing at localhost, and no amount of restarting fixes it. The build log says so when it is missing. With two domains serving the same site, this is also what tells a search engine which one is the real one. |
