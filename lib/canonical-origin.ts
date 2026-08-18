/**
 * THE ONE ADDRESS THIS SITE IS SERVED ON — and it has a "www." on it.
 *
 * Cloudflare answers the bare domain with a permanent redirect to the www
 * host, so www is where every visitor, every crawler and every share link
 * actually ends up. The site used to say the opposite in its canonical tags,
 * in every <loc> of its sitemap and in robots.txt — a canonical naming an
 * address that redirects away from itself is the one instruction a search
 * engine cannot follow.
 *
 * WWW RATHER THAN THE BARE DOMAIN, DELIBERATELY. Either would work if the site
 * said the same thing consistently, and www is the one already in force: it is
 * where the redirect points, where anything indexed has been landing, and
 * where the sign-in cookie is set. Turning the redirect around instead would
 * invert all of that for a cosmetic preference. Long run www is also the more
 * flexible host — it can be a CNAME, and a cookie set on it does not leak to
 * every subdomain.
 *
 * If the redirect is ever turned around, change this and change Cloudflare in
 * the same breath. They are one decision, not two.
 *
 * IT LIVES IN ITS OWN FILE so the admin shell — a client component — can name
 * the host without pulling lib/seo, and its build-time warning, into the
 * browser bundle. Nothing here has a side effect.
 */
export const CANONICAL_ORIGIN = "https://www.whitegloveitineraries.com";
