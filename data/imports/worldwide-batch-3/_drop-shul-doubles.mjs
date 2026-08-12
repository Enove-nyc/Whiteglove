/**
 * Heritage / attraction rows that soft-match a shul in the same city recreate
 * Attraction + Practical doubles in Needs review (Abuhav Synagogue). Drop them
 * before writing city JSON so regeneration cannot reintroduce the pair.
 */

function softListingName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(framing|daytime|courtyard|outdoor|approach|orientation|historic|visitor|resource|site|tradition)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function dropShulDoubles(cities) {
  return cities.map((city) => {
    const shulSoft = new Set((city.shuls || []).map(softListingName));
    return {
      ...city,
      heritage: (city.heritage || []).filter((name) => !shulSoft.has(softListingName(name))),
      attractions: (city.attractions || []).filter((name) => !shulSoft.has(softListingName(name))),
    };
  });
}
