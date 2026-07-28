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
| `SITE_ACCESS_PASSWORD` | The password on the whole site. |
| `SITE_LOCK_ENABLED` | Whether the lock is on at all. |
| `SITE_OPEN_HOSTS` | Comma-separated hostnames that skip the password entirely, e.g. `enovenyc.com`. Lets one domain stay open for reviewers while the main domain stays private. Case, port and a `www.` prefix are ignored. |
| `SITE_PREVIEW_TOKEN` | At least 12 characters. Anyone opening `?preview=<token>` gets in for 30 days without being told the password, and the token is stripped from the URL straight away. Change it to revoke every outstanding link at once. Never works on `/admin`. |
| `ADMIN_PASSWORD` | The admin dashboard password. |
| `ADMIN_HOST` | Optional. A hostname that serves the admin area on its own, e.g. `admin.whitegloveitineraries.com`. On that hostname every path is an admin path — `/` is the dashboard, `/shomrim` is the shomer screen — and the `/admin/…` paths keep working there too, so no saved link breaks. The hostname is never indexed. Unset by default, and with it unset nothing changes. **Add the domain in Vercel and point the DNS first**; the variable does nothing until the hostname actually reaches the site. |
| `ADMIN_HOST_ONLY` | Optional, `1` to turn on. Sends `/admin/…` on the main domain to `ADMIN_HOST`, so there is one place to sign in. Leave it off until you have opened the admin hostname and signed in there successfully — switching it on before DNS resolves leaves no way into the admin area at all. |
| `WHITE_GLOVE_SESSION_SECRET` | Signs the access and admin cookies. Changing it signs everybody out. |

## Email (Resend)

| Variable | What it does |
| --- | --- |
| `RESEND_API_KEY` | Required for any mail to send at all. |
| `RESEND_FROM_EMAIL` | The sender. **Until this is a verified domain sender, Resend's sandbox will only deliver to the address that owns the Resend account** — which is the usual reason mail to `contact@` never arrives. Verify the domain in Resend, then set this to e.g. `White Glove <no-reply@whitegloveitineraries.com>`. |
| `OWNER_NOTIFICATION_EMAIL` | Where edit suggestions go. Defaults to `edits@whitegloveitineraries.com`. |
| `CONTACT_NOTIFICATION_EMAIL` | Where contact-form messages go. Defaults to `contact@whitegloveitineraries.com`. |

The admin dashboard has a diagnostic panel that sends a test message to either
inbox and reports exactly what Resend said, including the sandbox restriction.

## Booking partners

| Variable | What it does |
| --- | --- |
| `BOOKING_AFFILIATE_ID` | Booking.com affiliate ID. Hotel searches carry it once set. |
| `KAYAK_AFFILIATE_PARAMS` | Query string appended to Kayak links. |
| `TRAVELPAYOUTS_MARKER` | Travelpayouts marker — one free account covering flights, hotels and insurance. |

All optional: without them the Book page still works, the links just carry no
tracking and earn nothing.

## Storage and services

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | Postgres, via Prisma — the directory content. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Accounts, itineraries, share links, ads, analytics, media. |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | The travel assistant. Without either it says it is unavailable rather than guessing. |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_HOSTNAME`, `DUFFEL_ACCESS_TOKEN`, `AERODATABOX_API_KEY` | Flight data providers. Optional. |
| `NEXT_PUBLIC_SITE_URL` | Absolute base URL, used in shared itinerary links and emails. |
