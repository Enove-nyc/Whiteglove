/**
 * White Glove Kosher Travel has closed. Its domain now shows one notice and
 * points travellers to White Glove Itineraries, where the same login and the
 * same trips are available (both sites read the same account store).
 *
 * WHY THIS IS A HOST LIST AND NOT brandForHost(). brandForHost() treats every
 * unrecognised host as kosher — localhost, a Railway or Netlify preview, any
 * new hostname. Keyed on that, the closure would swallow the merged site the
 * moment it was served from an address that is not the itineraries domain.
 * Only the real kosher hostnames close.
 *
 * Imports only the import-free brand core, so the edge middleware can use it
 * and tests can pin it.
 */

import { BRAND_HOSTS, BRAND_ORIGIN } from "./site-brand-core";

type HeaderBag = { get(name: string): string | null };

function bare(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(",")[0].split(":")[0].trim();
}

/** True when the request arrived on whiteglovekoshertravel.com or any subdomain of it. */
export function isClosedKosherHost(headers: HeaderBag): boolean {
  // The domain and ANY subdomain of it ("no subdomains, nothing else").
  const closed = (host: string) => BRAND_HOSTS.kosher.includes(host) || host.endsWith(".whiteglovekoshertravel.com");
  return closed(bare(headers.get("x-forwarded-host"))) || closed(bare(headers.get("host")));
}

/**
 * True for any subdomain of the closed domain other than www — admin. and the
 * rest (owner, 20 November 2026: "keep www, delete the rest"). They answer
 * "not found" rather than the notice, so nothing but the one address looks
 * like a page; the owner deletes their DNS records in Cloudflare.
 */
export function isRetiredKosherSubdomain(headers: HeaderBag): boolean {
  const retired = (host: string) => host.endsWith(".whiteglovekoshertravel.com") && !BRAND_HOSTS.kosher.includes(host);
  return retired(bare(headers.get("x-forwarded-host"))) || retired(bare(headers.get("host")));
}

export type ClosureAction = { kind: "notice" };

/**
 * What the closed kosher domain does with a path: show the notice. Always.
 *
 * THE OWNER'S WORD (18 November 2026): "under White Glove Kosher Travel domain
 * should only be one page that we are closed. Not an admin, nothing, no
 * subdomains, nothing else." So there is no admin here, no API, no trip-link
 * forwarding and no files — every address is the one notice. Its two buttons
 * are ordinary links to White Glove Itineraries, where the admin and every
 * traveller's trips now live.
 */
export function closureAction(_pathname?: string): ClosureAction {
  return { kind: "notice" };
}

const ITINERARIES = BRAND_ORIGIN.itineraries;

/** The whole notice, as one self-contained page: no scripts, no database. */
export const CLOSURE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>White Glove Kosher Travel has closed</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px 16px; background: #F7F4EE; color: #102F35;
    font-family: Georgia, "Times New Roman", serif; }
  main { width: 100%; max-width: 560px; background: #FFFDFC; border: 1px solid #E4D7BC;
    border-top: 4px solid #C6A15B; padding: 40px 32px; box-shadow: 0 12px 30px rgba(16,47,53,.08); }
  .eyebrow { margin: 0 0 12px; font: 700 12px/1.4 system-ui, -apple-system, sans-serif;
    letter-spacing: .2em; text-transform: uppercase; color: #8A6A2B; }
  h1 { margin: 0 0 16px; font-size: 30px; line-height: 1.2; font-weight: 600; }
  p { margin: 0 0 16px; font: 17px/1.6 system-ui, -apple-system, sans-serif; color: #2B4A50; }
  .actions { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; }
  a.button { display: inline-block; padding: 14px 22px; font: 600 16px/1 system-ui, -apple-system, sans-serif;
    text-decoration: none; border-radius: 4px; }
  a.primary { background: #193F46; color: #FFFDFC; }
  a.primary:hover { background: #102F35; }
  a.secondary { color: #193F46; border: 1px solid #193F46; }
  @media (max-width: 480px) { main { padding: 32px 20px; } h1 { font-size: 26px; } a.button { width: 100%; text-align: center; } }
</style>
</head>
<body>
<main>
  <p class="eyebrow">White Glove Kosher Travel</p>
  <h1>We have closed.</h1>
  <p>Thank you for travelling with us.</p>
  <p>If you planned a trip here, your itineraries are waiting on White Glove Itineraries. Sign in there with the same email and password you used on this site.</p>
  <div class="actions">
    <a class="button primary" href="${ITINERARIES}/login">Sign in to White Glove Itineraries</a>
    <a class="button secondary" href="${ITINERARIES}">Visit White Glove Itineraries</a>
  </div>
</main>
</body>
</html>`;
