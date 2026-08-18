// Community eruvin.
//
// An eruv is the one piece of practical Torah infrastructure whose answer
// changes every single week: it can come down on any Shabbos, sometimes
// without notice, and carrying on the strength of last week's status is
// exactly the mistake this page exists to prevent. So an eruv listing here is
// not a claim that the eruv is up — it is a pointer to the community's own
// status, which it publishes fresh each Erev Shabbos, and a standing warning
// to check it before you carry.
//
// For that reason these entries store no coordinate: an eruv is an area, not a
// point, its boundary is on the community's own map, and it is not a pin to
// drop on ours. Each link below was checked to resolve. A community not listed
// here can be found on the worldwide eruv directory at eruv.org.

export type NotableEruv = {
  slug: string;
  name: string;
  city: string;
  country: string;
  /** The community's own eruv-status page — live, and updated each Erev Shabbos. */
  statusUrl: string;
  /** The areas the eruv takes in, in the community's own words. */
  covers?: string;
};

export const notableEruvin: NotableEruv[] = [
  {
    slug: "nw-london",
    name: "The North-West London Eruv",
    city: "London",
    country: "United Kingdom",
    statusUrl: "https://nwlondoneruv.org/",
    covers: "Golders Green, Hendon and the surrounding streets",
  },
  {
    slug: "manchester",
    name: "The Manchester Eruv",
    city: "Manchester",
    country: "United Kingdom",
    statusUrl: "https://www.manchestereruv.org.uk/",
    covers: "Broughton Park and the north Manchester community",
  },
  {
    slug: "manhattan",
    name: "The Manhattan Eruv",
    city: "New York",
    country: "United States",
    statusUrl: "https://www.manhattaneruv.org/",
    covers: "most of Manhattan's Upper West and Upper East Sides and the park between",
  },
  {
    slug: "los-angeles",
    name: "The Los Angeles Community Eruv",
    city: "Los Angeles",
    country: "United States",
    statusUrl: "https://www.laeruv.com/",
    covers: "the Pico-Robertson and Fairfax areas",
  },
  {
    slug: "miami-beach",
    name: "The Miami Beach Eruv",
    city: "Miami Beach",
    country: "United States",
    statusUrl: "https://www.miamibeacheruv.com/",
    covers: "Miami Beach and the surrounding island",
  },
  {
    slug: "baltimore",
    name: "The Eruv of Baltimore",
    city: "Baltimore",
    country: "United States",
    statusUrl: "https://eruvofbaltimore.org/",
    covers: "the northwest Baltimore community",
  },
  {
    slug: "toronto",
    name: "The Toronto Eruv",
    city: "Toronto",
    country: "Canada",
    statusUrl: "https://torontoeruv.org/",
    covers: "the community along the Bathurst corridor",
  },
  {
    slug: "sydney",
    name: "The Sydney Eruv",
    city: "Sydney",
    country: "Australia",
    statusUrl: "https://sydneyeruv.org.au/",
    covers: "the eastern suburbs around Bondi",
  },
  {
    slug: "melbourne",
    name: "The Melbourne Eruv",
    city: "Melbourne",
    country: "Australia",
    statusUrl: "https://cosv.org.au/eruv/",
    covers: "Caulfield, St Kilda, Elwood and the neighbouring suburbs",
  },
];

/** The worldwide eruv directory, for any community not listed above. */
export const WORLDWIDE_ERUV_DIRECTORY = "https://www.eruv.org/";
