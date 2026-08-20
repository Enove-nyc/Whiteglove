// Community eruvin.
//
// An eruv listing here says one thing: this community maintains an eruv. It is
// not a claim that the eruv is up on any given Shabbos — an eruv can come down,
// and the community's own current word is what a traveller relies on before
// carrying. So each entry points at a source that establishes the eruv: the
// community's own eruv page where it keeps one, or an authoritative reference
// that documents it. Where the community publishes a boundary map, the entry
// links that too, since the map is the clearest answer to "how far does it go".
//
// These entries store no coordinate: an eruv is an area, not a point, its
// boundary is on the community's own map, and it is not a pin to drop on ours.
// Each link below was checked to resolve. A community not listed here can be
// found on the worldwide eruv directory at eruv.org.

export type NotableEruv = {
  slug: string;
  name: string;
  city: string;
  country: string;
  /** A source that establishes the eruv — the community's own page, or an authoritative reference. */
  sourceUrl: string;
  /** The community's boundary map, where it publishes one. */
  mapUrl?: string;
  /** The areas the eruv takes in. */
  covers?: string;
};

// Communities documented on the Wikipedia overview of eruvin. Used as the
// source where a community keeps no stable public page of its own.
const WIKI_ERUV = "https://en.wikipedia.org/wiki/Eruv";

export const notableEruvin: NotableEruv[] = [
  {
    slug: "nw-london",
    name: "The North-West London Eruv",
    city: "London",
    country: "United Kingdom",
    sourceUrl: "https://nwlondoneruv.org/",
    covers: "Golders Green, Hendon and the surrounding streets",
  },
  {
    slug: "manchester",
    name: "The Manchester Eruv",
    city: "Manchester",
    country: "United Kingdom",
    sourceUrl: "https://www.manchestereruv.org.uk/",
    covers: "Broughton Park and the north Manchester community",
  },
  {
    slug: "manhattan",
    name: "The Manhattan Eruv",
    city: "New York",
    country: "United States",
    sourceUrl: "https://www.manhattaneruv.org/",
    covers: "most of Manhattan's Upper West and Upper East Sides and the park between",
  },
  {
    slug: "los-angeles",
    name: "The Los Angeles Community Eruv",
    city: "Los Angeles",
    country: "United States",
    sourceUrl: "https://www.laeruv.com/",
    covers: "the Pico-Robertson and Fairfax areas",
  },
  {
    slug: "miami-beach",
    name: "The Miami Beach Eruv",
    city: "Miami Beach",
    country: "United States",
    sourceUrl: "https://www.miamibeacheruv.com/",
    covers: "Miami Beach and the surrounding island",
  },
  {
    slug: "baltimore",
    name: "The Eruv of Baltimore",
    city: "Baltimore",
    country: "United States",
    sourceUrl: "https://eruvofbaltimore.org/",
    covers: "the northwest Baltimore community",
  },
  {
    slug: "toronto",
    name: "The Toronto Eruv",
    city: "Toronto",
    country: "Canada",
    sourceUrl: "https://torontoeruv.org/",
    covers: "the community along the Bathurst corridor",
  },
  {
    slug: "sydney",
    name: "The Sydney Eruv",
    city: "Sydney",
    country: "Australia",
    sourceUrl: "https://sydneyeruv.org.au/",
    covers: "the eastern suburbs around Bondi",
  },
  {
    slug: "melbourne",
    name: "The Melbourne Eruv",
    city: "Melbourne",
    country: "Australia",
    sourceUrl: "https://cosv.org.au/eruv/",
    covers: "Caulfield, St Kilda, Elwood and the neighbouring suburbs",
  },
  {
    slug: "boston",
    name: "The Greater Boston Eruv",
    city: "Boston",
    country: "United States",
    sourceUrl: "https://www.bostoneruv.org/",
    covers: "Brookline, Newton and Brighton",
  },
  {
    slug: "five-towns",
    name: "The Five Towns Eruv",
    city: "Cedarhurst",
    country: "United States",
    sourceUrl: "https://www.fivetownseruv.org/",
    covers: "Lawrence, Cedarhurst, Woodmere and the neighbouring Five Towns",
  },
  {
    slug: "washington-heights",
    name: "The Washington Heights Eruv",
    city: "New York",
    country: "United States",
    sourceUrl: WIKI_ERUV,
    covers: "Washington Heights in upper Manhattan",
  },
  {
    slug: "flatbush",
    name: "The Flatbush Eruv",
    city: "Brooklyn",
    country: "United States",
    sourceUrl: WIKI_ERUV,
    covers: "the Flatbush and Midwood neighbourhoods of Brooklyn",
  },
  {
    slug: "boro-park",
    name: "The Borough Park Eruv",
    city: "Brooklyn",
    country: "United States",
    sourceUrl: WIKI_ERUV,
    covers: "Borough Park, Brooklyn",
  },
  {
    slug: "mexico-city",
    name: "The Mexico City Eruv",
    city: "Mexico City",
    country: "Mexico",
    sourceUrl: WIKI_ERUV,
    covers: "the Jewish neighbourhoods of Polanco, Tecamachalco and Bosques",
  },
  {
    slug: "antwerp",
    name: "The Antwerp Eruv",
    city: "Antwerp",
    country: "Belgium",
    sourceUrl: WIKI_ERUV,
    covers: "the Jewish quarter around the diamond district",
  },
  {
    slug: "amsterdam",
    name: "The Amsterdam Eruv",
    city: "Amsterdam",
    country: "Netherlands",
    sourceUrl: WIKI_ERUV,
    covers: "the Jewish neighbourhoods of Amsterdam",
  },
  {
    slug: "vienna",
    name: "The Vienna Eruv",
    city: "Vienna",
    country: "Austria",
    sourceUrl: WIKI_ERUV,
    covers: "the inner districts of Vienna",
  },
  {
    slug: "gibraltar",
    name: "The Gibraltar Eruv",
    city: "Gibraltar",
    country: "Gibraltar",
    sourceUrl: WIKI_ERUV,
    covers: "the town of Gibraltar",
  },
  {
    slug: "johannesburg",
    name: "The Johannesburg Eruv",
    city: "Johannesburg",
    country: "South Africa",
    sourceUrl: WIKI_ERUV,
    covers: "Glenhazel and the northern suburbs",
  },
  {
    slug: "venice",
    name: "The Venice Eruv",
    city: "Venice",
    country: "Italy",
    sourceUrl: WIKI_ERUV,
    covers: "the historic Ghetto and Cannaregio",
  },
];

/** The worldwide eruv directory, for any community not listed above. */
export const WORLDWIDE_ERUV_DIRECTORY = "https://www.eruv.org/";
