/**
 * Same soft-named place listed under two city seed lists recreates Needs-review
 * doubles (Attraction + Practical, heritage + shul, etc.). Keep the higher-
 * priority list and drop the soft-matching name from the others before writing
 * city JSON so regeneration cannot reintroduce the pair.
 *
 * Priority (keep first): shuls > mikvaos > cemeteries > communityResources >
 * heritage > attractions > stays
 */

function softListingName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bheritage walking corridor\b/g, "heritage corridor")
    .replace(/\bcommunity heritage corridor\b/g, "heritage corridor")
    .replace(
      /\b(framing|daytime|courtyard|outdoor|approach|orientation|historic|visitor|resource|site|tradition|walking|metro)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const LIST_PRIORITY = [
  "shuls",
  "mikvaos",
  "cemeteries",
  "communityResources",
  "heritage",
  "attractions",
  "stays",
];

export function dropShulDoubles(cities) {
  return cities.map((city) => {
    const claimed = new Map();
    for (const listName of LIST_PRIORITY) {
      const list = city[listName] || [];
      for (const name of list) {
        const key = softListingName(name);
        if (!key || claimed.has(key)) continue;
        claimed.set(key, listName);
      }
    }
    const next = { ...city };
    for (const listName of LIST_PRIORITY) {
      if (!city[listName]) continue;
      next[listName] = city[listName].filter((name) => claimed.get(softListingName(name)) === listName);
    }
    return next;
  });
}
