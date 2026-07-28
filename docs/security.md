# Security notes

## Rotate the Google Maps key

**The `GOOGLE_MAPS_API_KEY` currently on the deployment must be replaced.**

The admin routing diagnostic passed Google's raw error text through to the
browser and rendered it verbatim, and the AI diagnostic sent the Gemini key in a
URL query string. A key that has been displayed in a browser, written to a log,
or put in a URL has to be treated as compromised whether or not anyone
malicious saw it — URLs reach proxy logs, browser history, referrer headers and
error trackers.

To rotate:

1. Google Cloud Console → **APIs & Services → Credentials**.
2. **Create credentials → API key.** Restrict it: *API restrictions* → **Routes
   API** only; *Application restrictions* → **None** (requests come from the
   server, not a browser, so an IP or referer restriction would block them).
3. Put the new value in Vercel → Settings → **Environment Variables** as
   `GOOGLE_MAPS_API_KEY`, then redeploy — environment variables are read at
   build time.
4. Confirm it works from **Settings → Maps** in the admin.
5. **Delete the old key** in Google Cloud. Do not merely disable it.

Do the same for `GEMINI_API_KEY` if one is set, for the same reason.

## How secrets are kept out of the browser

`lib/redact.ts` is the single place that strikes secrets out of text. Every
admin diagnostic passes its output through it before returning.

It works in two passes:

- **Known values.** Every variable in `SECRET_ENV_VARS` that this deployment
  actually holds is struck out by exact match. Values under 8 characters are
  skipped — they are words, not secrets, and striking them would mangle
  ordinary prose.
- **Credential shapes.** Google (`AIza…`), Anthropic (`sk-ant-…`), OpenAI-style
  (`sk-…`), Resend (`re_…`), any `?key=`/`?token=`/`?password=` query
  parameter, `authorization` and `x-*-api-key` headers quoted back at us, and
  the credentials inside a `postgres://user:pass@host` connection string.

When adding a secret, add its variable name to `SECRET_ENV_VARS`.

### Rules

- **Never put a credential in a URL.** Use a header. A URL ends up in logs,
  referrers and error messages; a header does not.
- **Never return another server's error text unredacted.** It can quote our own
  request back at us.
- **Keep secret-dependent tests server-side.** A diagnostic runs on the server
  and returns a verdict; the key never reaches the client.
- **No secret goes in a `NEXT_PUBLIC_` variable.** Anything so prefixed is
  compiled into the client bundle and is public by definition. The only one
  this app uses is `NEXT_PUBLIC_SITE_URL`, which is the site's own address.

### What enforces this

`tests/redact.test.ts` covers the redaction itself, including that it leaves
ordinary prose alone and reaches into nested payloads.

`tests/admin-auth.test.ts` fails the build if:

- an admin API route does not verify the admin cookie,
- a route does any work before checking authorisation,
- a route hands back another server's error text without redacting it,
- a route interpolates a credential into a URL.

Run them with `npm test`, or `npm run check` for lint, types and tests together.

## Admin authorisation

Every route under `app/api/admin/` verifies the `white_glove_admin` cookie
against a token derived from the admin password before doing anything, and the
middleware blocks every `/admin` page except the login screen. Signing out is
the one deliberate exception: it only clears a cookie, and requiring a valid
session to clear an expired one would be a trap.

Server actions under `app/admin/*/actions.ts` check the same cookie inside each
action, not only at the page. A server action is a POST endpoint, so guarding
only the page that renders the form would leave the action itself open.

## Findings from the portal audit, and what was done

A survey of every admin route and mutation, checked a second time against the
code, turned up the following. All are fixed unless stated.

### The admin cookie could be computed by anyone — fixed

`lib/secure-access.ts` fell back to a constant secret compiled into the source
when neither `WHITE_GLOVE_SESSION_SECRET` nor `ADMIN_PASSWORD` was set. On such
a deployment the admin cookie was a fixed value anybody could work out from the
repository and paste into a cookie jar — and signing in was *impossible* in that
state, so the front door was bolted while the window stood open.

The secret is now null when nothing is configured, in production. No token is
minted and none validates: the site fails closed. Development keeps a local
fallback so `next dev` still works.

### The site password could be changed on the cookie alone — fixed

`/api/admin/password` asked for the current admin password only when changing
the *admin* password. Changing the *site* password skipped it, so a stolen
cookie was enough to lock every visitor out. Both now require it.

### No cross-site request protection on the API routes — fixed

Next checks `Origin` against `Host` for server actions, but a plain API route
gets no such check, and the admin cookie is `SameSite=Lax`, which a browser
still sends on a top-level cross-site POST. `sameOrigin()` now guards every
mutating admin route and the sign-in route. A request with no `Origin` is
allowed — that is a same-origin form post or a server-to-server call, neither of
which a hostile page can produce.

### Unlimited password guessing — fixed

`/api/access` had no attempt limit. `lib/access-attempts.ts` counts failures per
caller per scope in Redis, with a 15-minute window and 8 attempts. With no Redis
there is no counter and behaviour is unchanged, so this can never be the reason
somebody cannot sign in.

### The admin pages trusted middleware alone — fixed

No page under `app/admin/` checked the session itself; `/admin/accounts` served
every visitor's name, email and phone on the strength of a middleware redirect.
Next's own documentation in this repo says not to use middleware as the only
authorisation boundary. `app/admin/layout.tsx` now verifies the cookie and
renders the sign-in form instead of the page when it is missing.

### Signing out from another site — fixed

`/api/admin/logout` took no request at all, so any page could force the owner
out. Nuisance only, and now origin-checked. It still needs no session, because
an expired session must remain clearable.

### Known and not fixed

- **The admin cookie is a bearer token with no server-side session.** It does
  not change, so signing out on one device does not invalidate a copy taken from
  another, and rotating the password does not invalidate it. Fixing this
  properly means per-session records with revocation. Until then, treat
  `WHITE_GLOVE_SESSION_SECRET` as the revocation lever: changing it invalidates
  every outstanding cookie at once.
- **`/api/*` is exempt from the site lock** (`middleware.ts`), so public API
  routes answer while the site is closed. No admin route is affected — those
  check the cookie themselves.
- **`SITE_OPEN_HOSTS` trusts the `Host` header**, which a caller can set. It
  only affects the site lock, never admin authorisation.
