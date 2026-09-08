# Running the real site locally, so its buttons can actually be pressed

Nothing in here ships. It exists so that a session — or a person — can open the
site as the owner sees it, with a real database and a real signed-in admin, and
click things. Every automated test in this repository reads source or calls a
pure function; none of them press a button. Two live bugs found in one evening
(a lookup that returned 431 and silently unverified every kosher badge, an
admin "Open the full editor" link that led to the generic Add page) were
invisible to the test suite and obvious within a minute of clicking.

The awkward part is the database. Production uses Neon, and the app talks to it
through `@prisma/adapter-neon` — the Neon serverless driver, which speaks the
Postgres wire protocol inside **WebSocket binary frames over TLS on :443**, not
plain TCP. A local `postgres` on 5433 cannot answer that. `ws-pg-bridge.mjs`
is the missing piece: it terminates TLS, does the RFC 6455 handshake and frame
decoding by hand, and pipes the payload into a normal socket.

## Setup, once

```sh
# 1. Postgres. initdb refuses to run as root, so give it a user of its own.
PG=/usr/lib/postgresql/16/bin
useradd -m pguser 2>/dev/null; mkdir -p /tmp/pgdata && chown pguser /tmp/pgdata
su pguser -c "$PG/initdb -D /tmp/pgdata -U wg --auth=trust"
su pguser -c "$PG/pg_ctl -D /tmp/pgdata -o '-p 5433 -k /tmp' -l /tmp/pg.log start"
$PG/createdb -h 127.0.0.1 -p 5433 -U wg whiteglove

# The Neon driver always authenticates; trust auth makes it send a startup
# message the server does not expect ("invalid frontend message type 112").
$PG/psql -h 127.0.0.1 -p 5433 -U wg -d whiteglove -c "ALTER USER wg PASSWORD 'wg';"
sed -i -E 's/^(host\s+all\s+all\s+\S+\s+)trust/\1password/' /tmp/pgdata/pg_hba.conf
su pguser -c "$PG/pg_ctl -D /tmp/pgdata reload"

# 2. Schema.
DATABASE_URL='postgresql://wg:wg@127.0.0.1:5433/whiteglove' npx prisma migrate deploy

# 3. A throwaway certificate for the bridge.
openssl req -x509 -newkey rsa:2048 -nodes -keyout ws.key -out ws.crt -days 2 \
  -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1"
```

## Every run

```sh
cd scripts/local-audit
node ws-pg-bridge.mjs &     # wss://127.0.0.1:443  →  127.0.0.1:5433
node redis-mock.mjs &       # http://127.0.0.1:6380 — the Upstash REST shapes

cd ../..
npx next build
NODE_TLS_REJECT_UNAUTHORIZED=0 \
DATABASE_URL='postgresql://wg:wg@127.0.0.1:5433/whiteglove' \
UPSTASH_REDIS_REST_URL=http://127.0.0.1:6380 UPSTASH_REDIS_REST_TOKEN=local \
OWNER_EMAIL=owner@audit.local ADMIN_PASSWORD=audit-local-pass \
WHITE_GLOVE_SESSION_SECRET=audit-local-session-secret-0123456789 \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3002 \
npx next start -p 3002 &

curl -s http://127.0.0.1:3002/api/health   # both checks must say ok:true
node scripts/local-audit/bootstrap-auth.mjs http://127.0.0.1:3002
```

`bootstrap-auth.mjs` registers the owner account, marks it verified by editing
the record in the Redis stand-in (the verification code is stored only as a
hash, and no mail is sent locally), signs in, opens an admin session, seeds the
database from `data/*.ts`, and writes `auth-state.json` — a Playwright
`storageState` carrying the three cookies. Hand that to a browser context and
you are the owner.

## Clicking

```sh
node scripts/local-audit/crawl.mjs       http://127.0.0.1:3002 public.json 50
node scripts/local-audit/admin-crawl.mjs http://127.0.0.1:3002 admin.json
```

Both walk the site at 1280px and 390px, follow every same-origin link, press
every visible control that does not write, and record dead links, stuck
`Loading`, spinners that never stop, horizontal overflow, controls under the
fixed bottom bar, dialogs that ignore Escape, failed requests and page errors.
`admin-crawl.mjs` deliberately does **not** press Save, Delete, Approve,
Publish, Import or Upload; those want a scripted run of their own that checks
the row afterwards.

## Two things that will waste your time

**Playwright's browser path is wrong.** `PLAYWRIGHT_BROWSERS_PATH` points at a
build that is not installed, and `chromium.launch()` fails asking you to run
`playwright install` — which the environment tells you not to do. Pass
`executablePath` explicitly; find it with
`find /opt/pw-browsers -name headless_shell -o -name chrome | head -1`.

**Chromium cannot reach the public internet.** Through this environment's proxy
every navigation to a real domain ends in `ERR_CONNECTION_RESET`, whatever the
proxy settings. `curl` works; the browser does not. So the live sites can only
be checked with `curl`, and anything needing a rendered page has to run against
the local server. Say so plainly in any report rather than implying the live
site was clicked.

## What has actually been pressed

The read half of the site was crawled first; the write half was the honest gap,
because `admin-crawl.mjs` deliberately never presses Save. On 8 September 2026
the write paths were driven by hand through a real browser against this rig —
UI, action, API, database, reload, public page — and four things were wrong.

A listing's quick-edit panel (the one View opens on `/admin/directory/food`)
opened with Phone, Website and Description **blank whatever the row held**, and
the save writes those three straight back. Correcting a spelling on Chez David
in Preshburg deleted its phone number, its website and its notes, from the
database and from `/preshburg`. The panel also showed "Live on the site" ticked
for a row that was a draft, so any correction published it. Both came from
`listAdminCatalog` seeding the panel with three fields while
`/api/admin/listing` wrote back seven.

Every one of those rows also carried a "Public page" button pointing at
`/destinations/<slug>`, which is the vacation hub — a 404 for all eleven of
them. There is one rule for which page a town lives on and it is
`destinationHrefFor` in `lib/shuls.ts`; the admin had quietly grown a second.

On `/admin/advertisements`, publishing said "Published — it is live now"
directly above "No advertisements yet", and Delete said "Deleted." with the row
still on screen. The writes were always fine — `AdManager` read
`data.promotions` from a response that has always answered `{ bundle }`.

What was exercised and found correct: a listing edit reaching the public page,
accepting a visitor's submission from `/submit` through
`/admin/content?tab=suggestions`, deleting a listing and restoring it from
Deleted, and uploading a picture and publishing it — including the credit gate,
which correctly refuses to publish and saves as a draft instead.

Two notes for whoever runs this next. Visitor photo submissions are closed
(`/api/photos` answers 410), so the only live photo path is the owner's own
upload in the destination editor. And the full-screen site notice has to be
dismissed before anything can be clicked; seeding `whiteGloveBetaNotice` and
`whiteGloveBetaNoticeShown` in localStorage through `addInitScript` is the same
thing as pressing its button.
