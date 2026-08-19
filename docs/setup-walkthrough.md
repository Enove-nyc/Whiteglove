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

## 1. The Google Maps key you already have — keeping it

Decided: the working key stays. Nothing here changes it or requires a redeploy.

What is worth five minutes is putting a fence around it, which does not break
it. The site only ever asks that key for driving times, so restricting it to
that one API means a copy of it could not be spent on anything else.

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials** → click the key → **Edit**.
2. *API restrictions* → **Restrict key** → tick **Routes API** only.
3. *Application restrictions* → leave **None**. This key is used by the server,
   not a browser, so a referrer or IP restriction would block it.
4. Save. Then check admin → **Settings → Connections**: the routing test should
   still come back with a Google time.

Also worth setting, in Google Cloud → **Billing → Budgets & alerts**, a budget
with an email alert. It will not stop a spend, but it tells you the same day.

If you ever do decide to rotate it: create a second key restricted the same
way, put it in Vercel as `GOOGLE_MAPS_API_KEY`, redeploy, confirm the routing
test is green, and only then delete the old one.

## 2. A second Google key, for the map

Until this is set, visitors see the map-unavailable state and can continue
browsing the site's curated listings. The browser key enables the Google map
used to display those White Glove markers.

**It must not be the key from step 1.** Google's map runs in the visitor's
browser, so its key goes out in the page — that is normal and unavoidable, and
Google's answer is to restrict the key rather than hide it. But it means anyone
reading the page source has that key. If it were the step-1 key, they would
have your driving-times quota too.

### Getting it

1. [Google Cloud Console](https://console.cloud.google.com/). Top left, make
   sure the **project** shown is the one your existing key is in — the picker
   is next to the Google Cloud logo.
2. Open the API straight from this link:
   **<https://console.cloud.google.com/apis/library/maps-backend.googleapis.com>**
   It says **Enable** if it is off and **Manage** if it is already on.

   That URL looks wrong and is not. The Maps JavaScript API's internal name is
   `maps-backend.googleapis.com`, which is why searching the API list for "Maps
   JavaScript" and scrolling the enabled ones can fail to turn it up even when
   it is switched on. Two other places to look, both of which list it under the
   name you expect:
   - Every Maps API and its state:
     <https://console.cloud.google.com/google/maps-apis/api-list>
   - Everything enabled on the project:
     <https://console.cloud.google.com/apis/dashboard>
3. **[Credentials](https://console.cloud.google.com/apis/credentials) → Create credentials → API key.** A box
   appears with the new key. Copy it, then press **Edit API key** in that same
   box.
4. Give it a name you will recognise later — *Map — browser* — and set:
   - **Application restrictions** → **Websites** → **Add**, one entry at a
     time:
     - `https://whiteglovekoshertravel.com/*`
     - `https://www.whiteglovekoshertravel.com/*`
     - `https://*.vercel.app/*`  ← so preview deploys work too
     - your admin hostname, if you have set one
   - **API restrictions** → **Restrict key** → tick **Maps JavaScript API**,
     and nothing else.
5. **Save.** Restrictions can take a few minutes to take effect.

### Putting it in

6. Vercel → your project → **Settings → Environment Variables → Add**:
   - Key: `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`
   - Value: the key you just copied
   - Environments: **Production** (and **Preview**, if you want maps on preview
     links)
7. **Deployments → ⋯ → Redeploy.** This one especially: a `NEXT_PUBLIC_`
   variable is written into the pages when the site is built, so before the
   redeploy the key does not exist as far as the browser is concerned.
8. Admin → **Settings → Connections** → **The map**. It loads Google's map
   script exactly as the site does and tells you what happened: Google is
   working, the map is unavailable, or a key was refused — with the three
   things that cause a refusal.

### Billing, and what it costs

Google will not serve the map at all unless the project has a **billing
account** attached, even inside the free allowance. Billing → **Link a billing
account** if there is not one.

The Maps JavaScript API gives **10,000 map loads a month free**, then about
**$7 per 1,000**. A map load is counted when a page with a map on it opens. At
this site's traffic that is comfortably inside the free tier, and it is
separate from the driving-times key in step 1, which has its own allowance.

Worth doing while you are there: **Billing → Budgets & alerts** → a budget with
an email alert. It will not cap a spend, but it tells you the same day.

## 3. Flight lookup by flight number — done

Connected, and looking up flights. Nothing further is needed.

It runs on **AeroDataBox**, through RapidAPI, as `AERODATABOX_API_KEY`. Amadeus
used to be supported alongside it and has been removed — sign-up was the
obstacle, and the two were never a real pair anyway: whenever Amadeus keys were
present they were used *instead of* AeroDataBox, never as a fallback, so adding
Amadeus test keys would have replaced a working lookup with a thinner one.

The one limit worth knowing: the free RapidAPI tier is small, so several
lookups in the same minute can come back "try again shortly". If that starts
happening to real travellers, the fix is a paid RapidAPI tier rather than a
second provider.

## 4. Signing up with a phone number

**Optional, and the only thing on this list that costs money.** Sign-up by
email already works and is free. This step only adds the choice of signing up
with a phone number instead.

### Is there a way to do it for nothing?

Not one you can rely on. The free trick used to be the carriers' own
email-to-text gateways — send mail to `5551234567@txt.att.net` and it arrived
as a text. AT&T shut theirs down on 17 June 2025, and Verizon and T-Mobile have
cut back their own and dropped any delivery guarantee. It was killed because it
was a route for phishing, and it is not coming back.

Every provider gives free trial credit (Twilio's is about $15), but in trial
mode a text can only be sent to a number you have already verified in their
console. That is enough to prove the code works. It cannot serve strangers
signing up, which is the whole point.

So: free to test, not free to run.

### What it costs to run

Two separate costs, and the per-message one is not the one that matters.

**Per message.** Roughly a cent, all in. The sticker price is $0.004 per
message at Telnyx, $0.0077 at Plivo, $0.0083 at Twilio, but US carriers add
their own surcharge on top, so once everything is counted a delivered
verification text runs about **$0.013–$0.018**. A thousand sign-ups is about
fifteen dollars.

**Registration, which is unavoidable in the US.** Texting American mobiles from
a business requires **A2P 10DLC** registration. Budget roughly:

| | |
|---|---|
| Brand registration, one-off | $4 as a sole proprietor, $44 as a registered business |
| Campaign vetting, one-off | about $15 |
| Campaign, monthly | about $10 |
| The phone number, monthly | $1–2 |

So about **$20–60 to start and $10–12 a month** thereafter, before a single
message. That monthly fee is the real cost of offering phone sign-up, and it is
charged whether anybody uses it or not.

Cheapest overall today is Telnyx or Plivo; Twilio costs a little more and is
the most documented. The site works with any of them — it is the same three
variables.

### Can you sign up instantly?

You can open an account, add a card and buy a number in about five minutes at
any of them. **Sending is the part that waits.** US delivery does not start
until the 10DLC registration is approved, which is days, occasionally weeks.
Registering as a **sole proprietor** is the fast lane — cheaper and usually
approved within a day or two — and its low throughput limit is irrelevant for
verification codes.

Numbers outside the US have no such rule. A text to an Israeli or British
mobile works the moment the account has credit.

### The recommendation

Leave it off. Email verification is already there, costs nothing, and nobody
has asked for phone sign-up yet. If people do ask, sole-proprietor 10DLC on
Telnyx is about $20 to start and ~$11 a month.

### If you decide to turn it on

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

The domain is registered and verified in Resend. One variable is left, and
without it the site still sends from Resend's shared sandbox address, which is
only allowed to deliver to the address that owns the Resend account —
everything to `contact@` and `edits@` is rejected outright.

1. Vercel → **Settings → Environment Variables → Add**.
   - Key: `RESEND_FROM_EMAIL`
   - Value: `White Glove Kosher Travel <no-reply@whiteglovekoshertravel.com>`
   - Environments: **Production** (tick Preview too if you want it there).
2. **Deployments → ⋯ → Redeploy.**
3. Admin → **Settings → Connections** → **Test the contact inbox** and **Test
   the edits inbox**. Both should come back green, and the messages should
   arrive.

The address in the angle brackets has to be on the domain you verified. It does
not have to be a real mailbox — nothing is delivered to it — but `no-reply@`
makes that plain to whoever receives the mail.

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

Click by click:

1. Go to [vercel.com](https://vercel.com/) and open your project.
2. Top tab bar → **Settings**.
3. Left-hand menu → **Environment Variables**.
4. In the **Key** box type exactly: `OWNER_EMAIL`
5. In the **Value** box type the email address you sign in to the site with —
   the visitor account, not your Vercel login. Just the address,
   `you@example.com`, with no name, no angle brackets, no quotes.
6. Under **Environments**, tick **Production**. Tick **Preview** as well if you
   want it to apply on preview links.
7. **Save.**
8. Top tab bar → **Deployments** → on the newest one, the **⋯** menu →
   **Redeploy**. Nothing takes effect until this is done: Vercel reads the
   variables when it builds.

That address then always keeps admin access and can always see the site while
it is closed, whatever else is set. It is what stops a mistake on the Team
screen locking you out of your own site.

## 8. One database setup run

This one confuses people because it sounds like it might wipe something. It
does not. Here is what it actually is.

The site keeps its content in a Postgres database. A database has to be told
what shape the content is — which tables exist, which columns are on them —
before anything can be saved into it. When the site gains a new feature, that
shape gains something new: the Pages editor added three columns to the `Page`
table (the blocks it saves, and the two search-listing fields). Those columns
do not appear on their own. Until they exist, pressing **Save draft** in the
Pages editor fails.

The button below is the site telling the database its current shape. It adds
what is missing and steps over everything that is already there.

1. Make sure `DATABASE_URL` is set in Vercel (**Storage → Postgres**, or a Neon
   database you created and pasted in).
2. Sign in to admin and go to **Destinations**.
   - If the database has never been set up, the whole page is the setup screen
     with one button: **Set up database & import destinations**. Press it. It
     takes about a minute.
   - If you have used the editor before, the page is the editor. In the left
     column, open **Re-import built-in content** and press **Re-import content
     now**.
3. Open admin → **Pages**, edit any page, press **Save draft**. If it saves,
   the columns are there and you are finished.

What it changes and what it does not:

- **Adds** any missing tables and columns. Existing ones are left alone.
- **Reloads** the built-in content that ships with the site — the destinations,
  cemeteries, tzaddikim and researched listings that come from the code.
- **Keeps** everything you added yourself: your own listings, your page edits,
  promotions, accounts, saved trips.
- **Overwrites** edits you made in the admin to an *imported* destination,
  because that destination is reloaded from the built-in data. If you have
  hand-edited an imported destination and want to keep the wording, copy it
  somewhere before you press it.
- **Deletes nothing else.** It is safe to run more than once.

---

## 9. Signing in with Google

Optional. Without it everybody signs in with an email and a password exactly as
they do now; with it they can press one button instead. **It signs them into the
same account either way** — somebody who already has a password account with
that email lands in it, with their trips and notes, having simply skipped typing
the password.

1. [Google Cloud Console](https://console.cloud.google.com/) → pick the same
   project the Maps key is in (or make a new one; it does not matter which).
2. **APIs & Services → OAuth consent screen**. If it has never been set up:
   - *User type*: **External**. *Create*.
   - *App name*: **White Glove Itineraries**. *User support email*: yours.
   - *App domain → Application home page*: `https://whiteglovekoshertravel.com`
   - *Authorised domains*: add `whiteglovekoshertravel.com`
   - *Developer contact*: your email. **Save and continue**.
   - *Scopes*: leave them. The site only asks for the email address and the
     name, and both come as standard. **Save and continue**.
   - *Publishing status*: press **Publish app**. While it says "Testing", only
     the addresses you list as test users can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - *Application type*: **Web application**.
   - *Name*: anything — "White Glove website" will do.
   - *Authorised JavaScript origins*: `https://whiteglovekoshertravel.com`
   - *Authorised redirect URIs*: this one, **exactly**, with no trailing slash:

     ```
     https://whiteglovekoshertravel.com/api/account/google/callback
     ```

     If this does not match character for character, Google refuses the sign-in
     with an error the visitor can do nothing about. It is the single most
     common thing to get wrong here.
   - **Create**. Google shows a **Client ID** and a **Client secret**.
4. In Vercel, add both:
   - `GOOGLE_CLIENT_ID` — the client ID (it ends in
     `.apps.googleusercontent.com`).
   - `GOOGLE_CLIENT_SECRET` — the client secret.
5. **Redeploy.** The "Continue with Google" button appears on the sign-in page.
   Until both are set it is simply not there.

**What to expect afterwards.** An account opened by Google has no password —
"Forgotten your password?" sets one if they ever want to sign in the other way.
An address Google has **not verified** is refused rather than linked, and the
page says so: linking by email means whoever proves they hold an address gets
the account behind it, so the proof has to be a real one.

---

## After all of it

Admin → **Settings → Connections** is the one screen that says what is working
and what is not, in plain words, for every service above. Anything still amber
there has not taken effect — usually because the redeploy has not happened yet.
