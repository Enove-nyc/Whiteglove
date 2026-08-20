// Mikvaos of the established kehillos.
//
// This is the most sensitive content on the site, and it is handled the most
// carefully. A mikvah's address, hours and arrangements change, and a women's
// mikvah is not a place a public travel site pins on a map — the community
// gives its details, by appointment, to those who need them.
//
// So these entries do NOT carry an address, hours or coordinates. What each
// one carries is the city, and a link to the worldwide mikvah directory's own
// page for that city (mikvah.org/directory) — the authoritative, live list the
// frum world already keeps. The listing tells a traveller a mikvah serves the
// community and where to find the current, exact details; it promises nothing
// itself, and it never appears as a pin on the map.
//
// Every URL below was checked to resolve. When one goes stale, the fix is to
// update it here, not to write an address into the file.

export type NotableMikvah = {
  slug: string;
  name: string;
  city: string;
  country: string;
  /** The city's page on the worldwide mikvah directory — live and authoritative. */
  directoryUrl: string;
  note: string;
};

const ARRANGE =
  "Use is by appointment. Find the current address, hours and contact on the worldwide mikvah directory, and arrange with the community ahead.";

function city(slug: string, name: string, cityName: string, country: string, note = ARRANGE): NotableMikvah {
  return {
    slug,
    name,
    city: cityName,
    country,
    directoryUrl: `https://www.mikvah.org/directory/${slug}`,
    note,
  };
}

export const notableMikvaos: NotableMikvah[] = [
  city("jerusalem", "Mikvaos of Jerusalem", "Jerusalem", "Israel"),
  // The plain /directory/london slug resolves to London, Ontario, not London,
  // England — so this one points at the searchable directory root, where
  // "London, England" (Edgware, Stamford Hill and the rest) is one search away.
  {
    slug: "london",
    name: "Mikvaos of London",
    city: "London",
    country: "United Kingdom",
    directoryUrl: "https://www.mikvah.org/directory/",
    note: `Search "London, England" on the worldwide mikvah directory. ${ARRANGE}`,
  },
  city("manchester", "Mikvaos of Manchester", "Manchester", "United Kingdom"),
  city("gateshead", "Mikvah in Gateshead", "Gateshead", "United Kingdom"),
  city("new-york", "Mikvaos of New York", "New York", "United States"),
  city("los-angeles", "Mikvaos of Los Angeles", "Los Angeles", "United States"),
  city("miami", "Mikvaos of Miami", "Miami", "United States"),
  city("toronto", "Mikvaos of Toronto", "Toronto", "Canada"),
  city("montreal", "Mikvaos of Montreal", "Montreal", "Canada"),
  city("buenos-aires", "Mikvaos of Buenos Aires", "Buenos Aires", "Argentina"),
  city("sydney", "Mikvah in Sydney", "Sydney", "Australia"),
  city("melbourne", "Mikvaos of Melbourne", "Melbourne", "Australia"),
  city("cape-town", "Mikvah in Cape Town", "Cape Town", "South Africa"),
  city("johannesburg", "Mikvaos of Johannesburg", "Johannesburg", "South Africa"),
  city("mexico-city", "Mikvaos of Mexico City", "Mexico City", "Mexico"),
  city("baltimore", "Mikvaos of Baltimore", "Baltimore", "United States"),
  city("chicago", "Mikvaos of Chicago", "Chicago", "United States"),
  city("lakewood", "Mikvaos of Lakewood", "Lakewood", "United States"),
  city("boston", "Mikvaos of Boston", "Boston", "United States"),
  city("bnei-brak", "Mikvaos of Bnei Brak", "Bnei Brak", "Israel"),
  city("detroit", "Mikvaos of Detroit", "Detroit", "United States"),
  city("monsey", "Mikvaos of Monsey", "Monsey", "United States"),
  city("beit-shemesh", "Mikvaos of Beit Shemesh", "Beit Shemesh", "Israel"),
  city("passaic", "Mikvaos of Passaic", "Passaic", "United States"),
  city("teaneck", "Mikvah in Teaneck", "Teaneck", "United States"),
  city("denver", "Mikvaos of Denver", "Denver", "United States"),
  city("tzfat", "Mikvaos of Tzfat", "Tzfat", "Israel"),
  city("haifa", "Mikvaos of Haifa", "Haifa", "Israel"),
  city("netanya", "Mikvaos of Netanya", "Netanya", "Israel"),
  city("ashdod", "Mikvaos of Ashdod", "Ashdod", "Israel"),
  city("silver-spring", "Mikvaos of Silver Spring", "Silver Spring", "United States"),
  city("amsterdam", "Mikvah in Amsterdam", "Amsterdam", "Netherlands"),
  city("antwerp", "Mikvaos of Antwerp", "Antwerp", "Belgium"),
  city("zurich", "Mikvah in Zurich", "Zurich", "Switzerland"),
  city("vienna", "Mikvah in Vienna", "Vienna", "Austria"),
  city("paris", "Mikvaos of Paris", "Paris", "France"),
];
