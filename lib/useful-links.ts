// Links off the site, and the one rule that makes them safe to print.
//
// Everything else the site links to is its own — lib/page-blocks.ts even
// forces card hrefs to be same-site, because a block editor is not a place to
// put a stranger's URL. These are the opposite: the whole point is that they
// leave, to umaninfo.com or lizansk.com, sites that know more about a town
// than we do.
//
// So the check has to happen here instead. A URL typed into an admin box is
// text until something decides it is a link, and `javascript:` and `data:` in
// an href are the two that turn a page into somebody else's.

export type UsefulLink = {
  label: string;
  url: string;
  note?: string | null;
};

/**
 * The URL if it is one we will put in an href, otherwise null.
 *
 * http is upgraded rather than refused: an owner typing a domain from memory
 * gets http, every site he would link to serves https, and refusing the link
 * teaches him nothing. A bare "umaninfo.com" is treated the same way.
 */
export function safeExternalUrl(value: string | undefined | null): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  // No scheme at all — assume the owner typed a domain.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return null;
  // A hostname with no dot is not a public site — it is a typo, or an attempt
  // at an internal address.
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/** "umaninfo.com" out of "https://www.umaninfo.com/ways", for showing where a link goes. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Drop anything that cannot be linked, and label anything that was not.
 *
 * A link with no label falls back to its host rather than being hidden: an
 * owner who pasted a URL and tabbed away should see the link on the page, not
 * wonder where it went.
 *
 * DEDUPED BY ADDRESS, FIRST ONE WINS. The links that ship with a guide are
 * also seeded into the database, so the moment the owner presses "Set up
 * database" the same link exists twice — once as a row he can edit, once in
 * the data file. Callers pass the database rows FIRST, so his edited version
 * is the one shown and the built-in copy falls away. Without this, pressing
 * that button silently listed every seeded link twice.
 *
 * Compared on the normalised URL rather than the raw string, so
 * "umaninfo.com" and "https://www.umaninfo.com/" are recognised as one link
 * even though only one of them was ever typed that way.
 */
export function publishableLinks(links: UsefulLink[]): Array<UsefulLink & { url: string; host: string }> {
  const seen = new Set<string>();
  return links.flatMap((link) => {
    const url = safeExternalUrl(link.url);
    if (!url) return [];
    // Trailing slash and case of the host are not a difference anybody means.
    const key = url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    const host = linkHost(url);
    return [{ ...link, url, host, label: link.label?.trim() || host }];
  });
}
