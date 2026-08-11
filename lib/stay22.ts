/**
 * The hotel search, through Stay22.
 *
 * WHY THIS EXISTS AT ALL. Booking.com turned this site down through Commission
 * Junction, and the Travelpayouts account came back with flights and car hire
 * but no hotel programme — so of the three searches, the one most likely to be
 * used was the one with no way to earn. Stay22 sits in front of Booking.com,
 * Expedia, Hotels.com, VRBO and Agoda under a single ID and takes small sites
 * that the OTAs turn down directly.
 *
 * AND IT IS BUILT, NOT WRAPPED. The other searches are routed by pasting a
 * redirect link and swapping the destination into it, because the site cannot
 * know a partner's search format. Stay22 publishes theirs, and it happens to
 * want exactly what the hotel form already collects: a place, two dates and a
 * number of adults. So the search is constructed properly rather than smuggled
 * inside somebody else's URL — which means the traveller's own dates survive,
 * and `roam` can pick whichever site suits them.
 *
 * Format from Stay22's own developer documentation:
 *   https://www.stay22.com/allez/roam?aid=<AID>&address=…&checkin=YYYY-MM-DD…
 *
 * THE ID IS THE ONLY THING TO SET. Not a link, not a script — the ID from the
 * dashboard. Everything else this site already knows.
 */

/** Which desk Allez sends the traveller to. */
export type Stay22Provider = "roam" | "booking" | "expedia" | "hotelscom" | "vrbo" | "agoda";

/**
 * `roam` is the default on purpose: it chooses the site that suits each
 * traveller rather than pinning everybody to one. Pinning is there for somebody
 * who has a reason to.
 */
export const DEFAULT_PROVIDER: Stay22Provider = "roam";

export const PROVIDERS: ReadonlyArray<{ key: Stay22Provider; label: string; note: string }> = [
  { key: "roam", label: "Let Stay22 choose", note: "Picks whichever booking site suits each traveller. The usual choice." },
  { key: "booking", label: "Booking.com", note: "Everybody goes to Booking.com." },
  { key: "expedia", label: "Expedia", note: "Everybody goes to Expedia." },
  { key: "hotelscom", label: "Hotels.com", note: "Everybody goes to Hotels.com." },
  { key: "vrbo", label: "Vrbo", note: "Whole homes rather than hotel rooms." },
  { key: "agoda", label: "Agoda", note: "Strongest in Asia." },
];

export type Stay22Settings = {
  /** The affiliate ID from the Stay22 dashboard. Empty means Stay22 is off. */
  aid: string;
  provider: Stay22Provider;
};

export const NO_STAY22: Stay22Settings = { aid: "", provider: DEFAULT_PROVIDER };

/** The label Stay22 reports earnings under, so this site's bookings are countable. */
export const CAMPAIGN = "whiteglove_book";

/**
 * Why this ID cannot be used, or null.
 *
 * The mistakes worth naming are the ones that look right: pasting the whole
 * Allez link instead of the ID out of it, or pasting the embed script.
 */
export function aidProblem(aid: string): string | null {
  const value = aid.trim();
  if (!value) return null;
  if (/<|script/i.test(value)) {
    return "That is a script rather than the ID. The ID is the short code on your Stay22 dashboard.";
  }
  if (/^https?:/i.test(value)) {
    return "That is a link. Take just the aid= value out of it — that is the ID.";
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return "A Stay22 ID is letters, numbers, dashes and underscores only.";
  if (value.length < 3) return "That is too short to be a Stay22 ID.";
  if (value.length > 64) return "That is too long to be a Stay22 ID.";
  return null;
}

export function isProvider(value: string): value is Stay22Provider {
  return PROVIDERS.some((p) => p.key === value);
}

/** The settings as stored, with anything missing or unusable falling back to off. */
export function mergeStay22(stored: Partial<Stay22Settings> | null | undefined): Stay22Settings {
  const aid = String(stored?.aid ?? "").trim();
  const provider = String(stored?.provider ?? "");
  return {
    aid: aidProblem(aid) ? "" : aid,
    provider: isProvider(provider) ? provider : DEFAULT_PROVIDER,
  };
}

/** Whether the hotel search should go through Stay22. */
export function stay22IsOn(settings: Stay22Settings | undefined): boolean {
  return Boolean(settings?.aid.trim()) && !aidProblem(settings?.aid ?? "");
}

export type HotelSearch = {
  /** City or town, as typed. */
  address: string;
  /** YYYY-MM-DD. */
  checkin: string;
  checkout: string;
  adults: number;
};

/**
 * The Allez address for this search.
 *
 * `aid` first, which is Stay22's own advice — it is how a malformed link gets
 * attributed and reported rather than dropped.
 */
export function allezUrl(search: HotelSearch, settings: Stay22Settings): string {
  const query = new URLSearchParams();
  query.set("aid", settings.aid.trim());
  query.set("address", search.address.trim());
  if (search.checkin) query.set("checkin", search.checkin);
  if (search.checkout) query.set("checkout", search.checkout);
  query.set("adults", String(Math.max(1, Math.floor(search.adults) || 1)));
  // Underscores rather than hyphens: Stay22 treats a hyphen as a separator and
  // would split the label.
  query.set("campaign", CAMPAIGN);
  const provider = isProvider(settings.provider) ? settings.provider : DEFAULT_PROVIDER;
  return `https://www.stay22.com/allez/${provider}?${query.toString()}`;
}

/* ---- Stay22 in front of a search this site already builds ---------------- */

/**
 * Stay22 is not only a hotel desk, and this is the part that took a live bug
 * to find.
 *
 * The flight search was going out to a partner whose deep link discards its
 * parameters, and the owner had a Stay22 link for Kayak sitting in his
 * dashboard that nothing here would accept. Traced end to end rather than
 * assumed, because a wrong deep link does not throw — it opens a front page
 * and the referral is lost in silence:
 *
 *   https://www.stay22.com/allez/kayak?aid=<AID>&link=<the search, encoded>
 *     → 302 https://www.kayak.com/in?a=kan_249623&enc_cid=<AID>
 *              &enc_pid=deeplinks&url=%2Fflights%2FJFK-FCO%2F2026-09-01%2F2026-09-08
 *       (this is where the kanid/kanlabel affiliate cookies are set)
 *     → 301 /flights/JFK-FCO/2026-09-01/2026-09-08
 *
 * The route and both dates arrive intact, in English, credited to the account.
 * Cars behave identically with a /cars/… link.
 *
 * SO IT IS BUILT, NOT PASTED, for the same reason the hotel search is: `link=`
 * is a slot the traveller's own search goes into. The SHORT link from the
 * dashboard — kayak.stay22.com/<aid>/<code> — cannot do this. Appending
 * `link=` to it produces a URL carrying the parameter twice, with Stay22's own
 * `link=https://kayak.com/` first. Measured, not guessed. What the short link
 * IS good for is telling us the aid and the desk, which is all this needs.
 */
export type Stay22Link = {
  /** The account the click is credited to. */
  aid: string;
  /** Which Stay22 desk — "kayak" and so on. Matched against the partner. */
  desk: string;
};

/**
 * The aid and desk inside a pasted Stay22 link, or null if it is not one.
 *
 * Accepts both shapes the dashboard hands out: the short link and a full allez
 * address. Deliberately tolerant about which — the owner should not have to
 * know that only one of the two is any use, and once the aid and desk are out
 * of it, neither is.
 */
export function readStay22Link(pasted: string): Stay22Link | null {
  let url: URL;
  try {
    url = new URL(pasted.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.host.toLowerCase();
  if (host !== "stay22.com" && !host.endsWith(".stay22.com")) return null;

  // The full address: stay22.com/allez/<desk>?aid=…
  const allez = /^\/allez\/([A-Za-z0-9_-]+)/.exec(url.pathname);
  if (allez) {
    const aid = (url.searchParams.get("aid") ?? "").trim();
    return aid && !aidProblem(aid) ? { aid, desk: allez[1].toLowerCase() } : null;
  }

  // The short link: <desk>.stay22.com/<aid>/<code>
  const desk = host.slice(0, -".stay22.com".length);
  const aid = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (!desk || desk === "www" || !aid || aidProblem(aid)) return null;
  return { aid, desk: desk.toLowerCase() };
}

/**
 * A search this site built, sent through Stay22 so it earns.
 *
 * Never throws and never mangles the search: an unusable link gives the search
 * back untouched, which is the same rule throughTravelpayouts follows. A
 * traveller who arrives at the right page on an untracked link has cost a
 * commission; one who arrives nowhere has cost a customer.
 */
export function stay22SearchUrl(searchUrl: string, link: Stay22Link | null): string {
  if (!link?.aid || aidProblem(link.aid) || !/^[a-z0-9_-]+$/.test(link.desk)) return searchUrl;
  const query = new URLSearchParams();
  // aid first, as Stay22 advises — it is how a malformed link is still
  // attributed rather than dropped.
  query.set("aid", link.aid);
  query.set("link", searchUrl);
  query.set("campaign", CAMPAIGN);
  return `https://www.stay22.com/allez/${link.desk}?${query.toString()}`;
}

/**
 * GetYourGuide's own search address for a place.
 *
 * WHY THIS EXISTS AT ALL. The tours hand-off was a landing link: whatever the
 * owner pasted, opened as-is, so every visitor arrived at the same GetYourGuide
 * page whether they had been reading about Rome or about Kraków. The site knows
 * which — it is the whole point of the page they came from — and throwing that
 * away is the same mistake as a car link that carries no city.
 *
 * IT IS ONLY BUILT WHEN THE PASTED LINK IS A STAY22 GETYOURGUIDE DESK. That is
 * what `link=` is for: a slot the traveller's own search goes into, exactly as
 * the Kayak chain above uses it. A Travelpayouts link, or a plain GetYourGuide
 * URL, has no such slot — those still open the landing page, unchanged, because
 * a search this site cannot express is better sent as a page that works than
 * as a guess that does not.
 *
 * NOT VERIFIED END TO END FROM HERE, and that is worth saying plainly next to
 * the Kayak chain that was. GetYourGuide answers 403 to every automated
 * request, including addresses known to be good, so the 403 tells us nothing
 * either way and no trace was possible. `/s/?q=` is GetYourGuide's own search
 * address as used by their site. A wrong one does not throw — it opens a front
 * page and the referral is lost in silence — so this is the one link on the
 * site whose first click should be somebody's rather than a test's.
 */
export function getYourGuideSearchUrl(where: string): string {
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(where.trim())}`;
}

/** The Stay22 desk that sells tours. */
export const TOURS_DESK = "getyourguide";

/**
 * The tours hand-off for a place, or null when it cannot be built.
 *
 * Null means "use what the owner pasted" — never a broken link.
 */
export function tourSearchUrl(where: string, pasted: string): string | null {
  const place = where.trim();
  if (!place) return null;
  const link = readStay22Link(pasted);
  if (!link || link.desk !== TOURS_DESK) return null;
  return stay22SearchUrl(getYourGuideSearchUrl(place), link);
}

/**
 * What the search button should say.
 *
 * THE PARTNER IS NOT NAMED, and that is the owner's decision rather than an
 * oversight. This used to read "Search hotels on Stay22", on the argument that
 * a traveller about to land on a site they did not choose should be told which
 * one first. The owner's position is that which network the referral runs
 * through is the site's own business, and the visitor's question is whether
 * they can search hotels — not who settles the commission. That is the normal
 * arrangement across travel sites.
 *
 * WHAT DID NOT GO WITH THE NAME. The new-tab warning stays, because a link
 * that silently takes over or opens a window is an accessibility failure
 * whoever it points at, and the commission disclosure stays, because that is
 * the thing that keeps the arrangement above board. Neither needs a brand:
 * "opens in a new tab" and "we may earn a commission" are true and complete
 * without one. Removing the name is a positioning choice; removing those would
 * be a different thing entirely.
 *
 * Constant now, and it no longer takes the settings — the label does not vary
 * by provider any more, and a parameter kept "in case" is one every caller has
 * to look up to discover it changes nothing. It stays a function because the
 * admin preview in Stay22Form renders it to show the owner the live button
 * text, and because one name is still the single place this wording changes.
 */
export function hotelButtonLabel(): string {
  return "Search hotels";
}

/** What is happening with hotels right now, in one sentence. Never null. */
export function describeStay22(settings: Stay22Settings): string {
  const problem = aidProblem(settings.aid);
  if (problem) return `Not in use — ${problem}`;
  if (!settings.aid.trim()) {
    return "Not set. Hotel searches open Booking.com directly, which works and earns nothing — and Booking.com turned this site down for their own programme, so there is no way to earn on them without this.";
  }
  const provider = PROVIDERS.find((p) => p.key === settings.provider) ?? PROVIDERS[0];
  return `Hotel searches go through Stay22 under ID ${settings.aid.trim()}. ${provider.note}`;
}
