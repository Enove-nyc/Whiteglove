# Setting the site up, step by step

Everything here is done in a browser — the Vercel dashboard and a few provider
sites. No code changes. Do them in this order; each one is independent, so you
can stop after any of them and the site keeps working.

**Where the variables go, every time:** Vercel → your project → **Settings →
Environment Variables** → *Add*. Set the value for **Production** (and Preview
if you want it there too), then **Deployments → ⋯ → Redeploy**. Environment
variables are read when the site is built, so nothing changes until you
redeploy.

---

## 1. Replace the Google Maps key you already have

You have a key. It still has to be replaced, because it was displayed in a
browser and put in a URL by two admin diagnostics that have since been fixed. A
key that has been shown anywhere has to be treated as known to somebody else,
whether or not it really is.

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials**.
2. **Create credentials → API key.** Copy the new key.
3. Click **Edit** on it:
   - *API restrictions* → **Restrict key** → tick **Routes API** only.
   - *Application restrictions* → **None**. This key is used by the server, not
     a browser, so an IP or referrer restriction would block it.
4. Vercel → Environment Variables → edit `GOOGLE_MAPS_API_KEY` → paste the new
   value → save → **redeploy**.
5. Check it: admin → **Settings → Connections**, the routing test should come
   back with a Google time.
6. Back in Google Cloud, **delete the old key**. Not disable — delete.

If you also have a `GEMINI_API_KEY`, do the same with it, for the same reason.

## 2. A second Google key, for the map

The map on the site draws with Google now, but the Maps JavaScript API runs in
the visitor's browser, so its key goes out in the page. That is normal and
unavoidable — Google's answer is to restrict the key rather than hide it.

**It must not be the key from step 1.** That one can call the Routes API, and
anyone reading the page source would have it.

1. Google Cloud Console → **APIs & Services → Library** → search **Maps
   JavaScript API** → **Enable**.
2. **Credentials → Create credentials → API key.** Copy it.
3. **Edit** it:
   - *API restrictions* → **Restrict key** → tick **Maps JavaScript API** only.
   - *Application restrictions* → **Websites**, and add:
     `whitegloveitineraries.com/*`, `*.whitegloveitineraries.com/*`, and your
     Vercel preview domain `*.vercel.app/*`.
4. Vercel → add `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` → paste → **redeploy**.

Until this is set the map still works; it draws with OpenStreetMap instead.
Note that Maps JavaScript bills separately from Routes, and every map load
counts.

## 3. Flight lookup by flight number

Free, no card. Turns on the "look up by flight number" box in the planner,
which fills in the airline, airports and times.

1. [developers.amadeus.com](https://developers.amadeus.com/) → **Register** →
   confirm the email.
2. **My Self-Service Workspace → Create New App.** It gives you an **API Key**
   and an **API Secret**.
3. Vercel → add:
   - `AMADEUS_CLIENT_ID` = the API Key
   - `AMADEUS_CLIENT_SECRET` = the API Secret
4. **Redeploy**, then try a real flight number in the planner.

Their **test** environment is the default and carries a thin schedule — plenty
to prove it works, not enough for real trips. When you are ready, move the app
to Production in their dashboard and add `AMADEUS_HOSTNAME=api.amadeus.com`.

## 4. Signing up with a phone number

Two things to know before you start. Texting a US mobile requires **A2P 10DLC
registration** — Twilio runs it as an application and it takes days, not
minutes; until it clears, messages to US numbers are rejected. And every text
costs a fraction of a cent, so unlike email it is not free.

1. [twilio.com](https://www.twilio.com/) → sign up → verify your own number.
2. **Phone Numbers → Buy a number**, with SMS capability.
3. From the console home, copy the **Account SID** and **Auth Token**.
4. Vercel → add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` — the number you bought, written `+15551234567`
5. **Messaging → Regulatory Compliance → A2P 10DLC** → register your brand and
   a campaign. Wait for it to be approved.
6. **Redeploy.** The sign-up form will now offer "Email address or phone
   number"; before this it asks for an email only.

Check it on admin → **Settings → Connections**, which says whether texts can
be sent and what is missing.

## 5. Make the contact and edits email actually arrive

This is the most likely reason mail is not reaching you. Until the domain is
verified, the mail service will only deliver to the address that owns the
Resend account — everything to `contact@` and `edits@` is rejected outright.

1. [resend.com](https://resend.com/) → **Domains → Add Domain** →
   `whitegloveitineraries.com`.
2. It gives you DNS records (SPF, DKIM, and usually a return-path). Add them
   wherever the domain's DNS lives, then press **Verify**. It can take an hour.
3. Vercel → add `RESEND_FROM_EMAIL` =
   `White Glove Itineraries <no-reply@whitegloveitineraries.com>`
4. **Redeploy.**
5. Admin → **Settings → Connections** → **Test the contact inbox** and **Test
   the edits inbox**. Both should come back green, and the messages should
   arrive.

`OWNER_NOTIFICATION_EMAIL` and `CONTACT_NOTIFICATION_EMAIL` only need setting
if you want those two queues somewhere other than `edits@` and `contact@`.

## 6. The private store — accounts, trips, hechsherim, the visitor log

Nothing that remembers anything works without this: visitor accounts, saved
trips, confirmed hechsherim, the sign-in log, the "sign everybody out" button,
and the record of what mail the site tried to send.

1. Vercel → your project → **Storage → Create Database → Upstash (Redis)**, or
   sign up at [upstash.com](https://upstash.com/) and create a database.
2. If you create it through Vercel, it sets the variables for you. If you make
   it at Upstash, copy the **REST URL** and **REST token** into Vercel as:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. **Redeploy.**

The free tier is generous and this site's use of it is small.

## 7. Name yourself as the owner

1. Vercel → add `OWNER_EMAIL` = the address you sign in to your own account
   with.
2. **Redeploy.**

That address always keeps admin access and can always see the site while it is
closed, whatever else is set. It is what stops a mistake on the Team screen
locking you out of your own site.

## 8. One database setup run, for the page editor

The Pages editor stores its blocks and its search titles in three columns that
have to exist before it can save.

1. Make sure `DATABASE_URL` is set (Vercel → **Storage → Postgres**, or Neon).
2. Admin → **Settings → Connections**, and use the database setup button there.
   It creates what is missing and leaves existing rows alone.
3. Open admin → **Pages**, edit a page, and press **Save draft**. If it saves,
   the columns are there.

Nothing is deleted by this. It only adds the missing columns.

---

## After all of it

Admin → **Settings → Connections** is the one screen that says what is working
and what is not, in plain words, for every service above. Anything still amber
there has not taken effect — usually because the redeploy has not happened yet.
