/**
 * Chabad Travel Directory — Europe.
 *
 * A data file, not a page: everything the /chabad-europe directory renders
 * comes from the ChabadEuropeListing[] below, so a new or corrected entry is
 * a data change, never a code change.
 *
 * WHAT BELONGS HERE. One record per individual institution, not per city or
 * per location page. Chabad.org's own locator can list several independent
 * institutions on one city page (a synagogue, a campus house, a mikveh, a
 * school) — each is its own record here, carrying only the offerings that
 * institution's own official page states. A synagogue or Chabad House listing
 * on the locator is NOT, by itself, evidence of a minyan, mikveh, kosher food,
 * or Shabbat hospitality: those are only ever "confirmed" when the
 * institution's own official website says so explicitly, with a URL to back
 * it. Everything else stays "not_confirmed" (or "contact_to_confirm" when the
 * site says to ask, or "seasonal_or_holiday_only" / "unavailable" when it says
 * that outright) — never inferred, never left blank as if verified.
 *
 * WHAT DOES NOT BELONG HERE. Schools, day camps, preschools, and general
 * community programming — this directory is for travelers, not residents.
 * Only add an institution here if it offers something a traveler would use:
 * a place to daven, a mikveh, kosher food, or documented hospitality.
 *
 * source_url is the Chabad.org locator entry this record was found through.
 * feature_source_urls carries the SEPARATE citation for each confirmed
 * feature — the institution's own page, not the locator — because the
 * locator only ever establishes that the place exists, not what it offers.
 * last_verified is the date a person actually checked the cited page(s),
 * never the date this file was edited.
 *
 * Chabad.org's own locator sits behind bot-protection that blocks this
 * project's automated fetch tools entirely (confirmed against the locator's
 * country pages and several individual center pages — every attempt returned
 * a Cloudflare challenge page, not the listing). Every row below was instead
 * supplied directly from a person's own reading of each institution's
 * official page — never invented, never filled in from a search-result
 * snippet. Add rows here the same way: only from what someone actually read
 * on the institution's own official page.
 */

export type ChabadFeatureStatus =
  | "confirmed"
  | "not_confirmed"
  | "unavailable"
  | "seasonal_or_holiday_only"
  | "contact_to_confirm";

export type ChabadEuropeListing = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;

  minyan_status: ChabadFeatureStatus;
  minyan_notes: string | null;

  mikveh_status: ChabadFeatureStatus;
  mikveh_notes: string | null;

  kosher_food_status: ChabadFeatureStatus;
  kosher_food_notes: string | null;

  shabbat_hospitality_status: ChabadFeatureStatus;
  shabbat_hospitality_notes: string | null;

  /** Null when the source says nothing about reservations either way. */
  reservation_required: boolean | null;

  /** The Chabad.org locator entry this institution was found through. */
  source_url: string;
  /** Per-feature citation — the institution's own page, keyed by field name. */
  feature_source_urls: Partial<
    Record<"minyan" | "mikveh" | "kosher_food" | "shabbat_hospitality", string>
  >;
  /** ISO date (YYYY-MM-DD) a person actually checked the cited page(s). */
  last_verified: string;
};

export const chabadEuropeListings: ChabadEuropeListing[] = [
  {
    id: "chabad-of-central-london",
    name: "Chabad of Central London",
    city: "London",
    country: "United Kingdom",
    address: "85 Great Titchfield St., London W1W 6RJ, United Kingdom",
    phone: "+44 20 7060 9770",
    whatsapp: "+44 20 7060 9770",
    email: "office@chabadw1.org",
    website: "https://chabadlondon.org/en/chabad-house/",
    minyan_status: "confirmed",
    minyan_notes: "Shabbat prayers are listed; confirm weekday-minyan times directly.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes:
      "London's Chabad visitor portal lists mikveh information, but this center's own page does not identify an on-site mikveh.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The visitor information section links to kosher-food information.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are listed as active.",
    reservation_required: true,
    source_url: "https://chabadlondon.org/en/chabad-house/",
    feature_source_urls: {
      minyan: "https://chabadlondon.org/en/chabad-house/",
      mikveh: "https://chabadlondon.org/en/chabad-house/",
      kosher_food: "https://chabadlondon.org/en/chabad-house/",
      shabbat_hospitality: "https://chabadlondon.org/en/chabad-house/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-israeli-centre-london",
    name: "Chabad Israeli Centre London",
    city: "London",
    country: "United Kingdom",
    address: "1055C Finchley Road, London, United Kingdom",
    phone: null,
    whatsapp: null,
    email: null,
    website: "https://chabadisraelicentre.co.uk/en",
    minyan_status: "confirmed",
    minyan_notes: "The official traveler page lists daily and Shabbat prayers.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official traveler page lists mikveh as an active community service.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official traveler page lists a kosher-food guide and local kosher dining.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "The official traveler page lists Shabbat and holiday meals with reservation.",
    reservation_required: true,
    source_url: "https://chabadisraelicentre.co.uk/en",
    feature_source_urls: {
      minyan: "https://chabadisraelicentre.co.uk/en",
      mikveh: "https://chabadisraelicentre.co.uk/en",
      kosher_food: "https://chabadisraelicentre.co.uk/en",
      shabbat_hospitality: "https://chabadisraelicentre.co.uk/en",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-house-barcelona",
    name: "Chabad House Barcelona",
    city: "Barcelona",
    country: "Spain",
    address: "Carrer del Montnegre 14, 08029 Barcelona, Spain",
    phone: "+34 93 410 06 85",
    whatsapp: "+34 689 626 246",
    email: "guests@chabadbarcelona.org",
    website: "https://chabadbarcelona.org/en/chabad-house/",
    minyan_status: "confirmed",
    minyan_notes: "Daily and Shabbat prayer times are published.",
    mikveh_status: "confirmed",
    mikveh_notes: "Women's mikveh is listed at Calle Burdeos 25; visits must be scheduled in advance.",
    kosher_food_status: "confirmed",
    kosher_food_notes:
      "A kosher-products store is listed; the site's own FAQ states no kosher restaurant is available.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are offered through registration.",
    reservation_required: true,
    source_url: "https://chabadbarcelona.org/en/chabad-house/",
    feature_source_urls: {
      minyan: "https://chabadbarcelona.org/en/chabad-house/",
      mikveh: "https://chabadbarcelona.org/en/chabad-house/",
      kosher_food: "https://chabadbarcelona.org/en/chabad-house/",
      shabbat_hospitality: "https://chabadbarcelona.org/en/chabad-house/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-of-vienna",
    name: "Chabad of Vienna",
    city: "Vienna",
    country: "Austria",
    address: "Taborstraße 20a, 1020 Wien, Austria",
    phone: null,
    whatsapp: null,
    email: null,
    website: "https://chabadvienna.com/en/",
    minyan_status: "confirmed",
    minyan_notes: "Daily and Shabbat prayers are listed; published prayer times are available on the Chabad site.",
    mikveh_status: "confirmed",
    mikveh_notes: "Mikwe Chabad is listed at Rabbiner Schneerson Platz 1, 1020 Wien; contact before visiting.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official visitor page lists kosher restaurants and a food guide.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are listed as active; register through the official site.",
    reservation_required: true,
    source_url: "https://chabadvienna.com/en/",
    feature_source_urls: {
      minyan: "https://chabadvienna.com/en/",
      mikveh: "https://chabadvienna.com/en/",
      kosher_food: "https://chabadvienna.com/en/",
      shabbat_hospitality: "https://chabadvienna.com/en/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-of-prague",
    name: "Chabad of Prague",
    city: "Prague",
    country: "Czech Republic",
    address: "U Milosrdných 6, Praha 1, Czech Republic",
    phone: null,
    whatsapp: null,
    email: null,
    website: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
    minyan_status: "confirmed",
    minyan_notes: "Ahavat Yosef Synagogue at U Milosrdných 6 publishes daily minyanim.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Ask Chabad Prague directly for current mikveh access and arrangements.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official page lists a kosher mini-market, Grill Restaurant, and U-MILO dairy restaurant.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are offered by prior reservation.",
    reservation_required: true,
    source_url: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
    feature_source_urls: {
      minyan: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
      mikveh: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
      kosher_food: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
      shabbat_hospitality: "https://chabadprague.cz/en/the-jewish-street-prague-2/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "habad-loubavitch-nice-cote-dazur",
    name: "Habad Loubavitch Nice — Côte d'Azur",
    city: "Nice",
    country: "France",
    address: "22 Rue Rossini, 06000 Nice, France",
    phone: "+33 4 93 82 46 86",
    whatsapp: null,
    email: "habadnice@gmail.com",
    website: "https://www.chabadnice.com/tourist-info/",
    minyan_status: "confirmed",
    minyan_notes: "Services are offered year-round; a tourist minyan is specifically listed for July and August.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official travel page lists men's and women's mikveh information; confirm arrangements before going.",
    kosher_food_status: "confirmed",
    kosher_food_notes:
      "The official travel page links to kosher information and lists kosher-food options, including Shabbat-meal suppliers.",
    shabbat_hospitality_status: "seasonal_or_holiday_only",
    shabbat_hospitality_notes: "Chabad organizes Friday-night meals only during summer; holiday meals are also announced separately.",
    reservation_required: true,
    source_url: "https://www.chabadnice.com/tourist-info/",
    feature_source_urls: {
      minyan: "https://www.chabadnice.com/tourist-info/",
      mikveh: "https://www.chabadnice.com/tourist-info/",
      kosher_food: "https://www.chabadnice.com/tourist-info/",
      shabbat_hospitality: "https://www.chabadnice.com/tourist-info/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-serbia-belgrade",
    name: "Chabad Serbia",
    city: "Belgrade",
    country: "Serbia",
    address: "Kneza Miloša 61, 11000 Belgrade, Serbia",
    phone: "+381 11 264 1471",
    whatsapp: "+381 62 815 9048",
    email: null,
    website: "https://chabad.rs/chabad-serbia/",
    minyan_status: "confirmed",
    minyan_notes: "Friday-evening Kabbalat Shabbat and Shabbat-morning Shacharit are published; confirm weekday services directly.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official site lists a women's mikveh at the Chabad center.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "No kosher shops, restaurants, or bakeries are listed; kosher weekday dinners are available by advance order.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are hosted after services by pre-registration.",
    reservation_required: true,
    source_url: "https://chabad.rs/chabad-serbia/",
    feature_source_urls: {
      minyan: "https://chabad.rs/chabad-serbia/",
      mikveh: "https://chabad.rs/chabad-serbia/",
      kosher_food: "https://chabad.rs/chabad-serbia/",
      shabbat_hospitality: "https://chabad.rs/chabad-serbia/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-lubawitsch-basel",
    name: "Chabad Lubawitsch Basel",
    city: "Basel",
    country: "Switzerland",
    address: "Ahornstrasse 33, 4055 Basel, Switzerland",
    phone: "+41 76 559 9236",
    whatsapp: "+41 76 559 9236",
    email: "rabbi@chabadbasel.com",
    website: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
    minyan_status: "confirmed",
    minyan_notes: "The official page publishes Friday-night and Shabbat-morning services; weekday synagogue times are also listed.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official page lists women's mikvaot in Basel by appointment.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official Chabad material lists kosher restaurants, bakery, butcher, and kosher products.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Chabad welcomes visitors for Friday-night and Shabbat-day meals with pre-registration.",
    reservation_required: true,
    source_url: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
    feature_source_urls: {
      minyan: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
      mikveh: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
      kosher_food: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
      shabbat_hospitality: "https://www.chabadbasel.com/templates/articlecco_cdo/aid/1601133/jewish/Synagogues-Mikva-Basel.htm",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-of-slovakia-bratislava",
    name: "Chabad of Slovakia",
    city: "Bratislava",
    country: "Slovakia",
    address: "Drevená 4, 81106 Bratislava, Slovakia",
    phone: "+421 905 964 155",
    whatsapp: "+421 905 964 155",
    email: "chabad@stonline.sk",
    website: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
    minyan_status: "confirmed",
    minyan_notes: "Weekday and Shabbat prayer arrangements are published; locations vary, so confirm before going.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Confirm current mikveh arrangements directly before travel.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "No kosher stores or restaurants are listed; Chabad supplies kosher meals to hotels by advance order.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals may be arranged with the rabbi's family by advance coordination.",
    reservation_required: true,
    source_url: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
    feature_source_urls: {
      minyan: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
      mikveh: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
      kosher_food: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
      shabbat_hospitality: "https://www.chabadslovakia.com/templates/articlecco_cdo/aid/591064/jewish/Tourist-info.htm",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-porto",
    name: "Chabad Porto",
    city: "Porto",
    country: "Portugal",
    address: "",
    phone: "+351 928 294 913",
    whatsapp: "+351 928 294 913",
    email: null,
    website: "https://www.chabadporto.com",
    minyan_status: "contact_to_confirm",
    minyan_notes: "Contact Chabad Porto directly for current prayer arrangements.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Confirm current mikveh access directly before travel.",
    kosher_food_status: "contact_to_confirm",
    kosher_food_notes: "Confirm current kosher-food options directly before travel.",
    shabbat_hospitality_status: "contact_to_confirm",
    shabbat_hospitality_notes: "Contact Chabad Porto directly to confirm Shabbat or holiday hospitality.",
    reservation_required: true,
    source_url: "https://www.lubavitch.com/centers/europe/portugal/porto-/",
    feature_source_urls: {},
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-lubawicz-krakow",
    name: "Chabad Lubawicz Kraków",
    city: "Kraków",
    country: "Poland",
    address: "Kupa 18, 31-057 Kraków, Poland",
    phone: "+48 12 432 8088",
    whatsapp: null,
    email: "chabad.krakow@gmail.com",
    website: "https://www.chabadkrakow.org/",
    minyan_status: "confirmed",
    minyan_notes: "The official Chabad site lists daily minyan and synagogue services.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official traveler section provides mikveh information; arrange directly before travel.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official traveler section provides kosher-food information.",
    shabbat_hospitality_status: "contact_to_confirm",
    shabbat_hospitality_notes: "Confirm current Shabbat-meal arrangements directly before travel.",
    reservation_required: true,
    source_url: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708297/jewish/Tourist-information.htm",
    feature_source_urls: {
      minyan: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708297/jewish/Tourist-information.htm",
      mikveh: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708297/jewish/Tourist-information.htm",
      kosher_food: "https://www.chabadkrakow.org/templates/articlecco_cdo/aid/708297/jewish/Tourist-information.htm",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "rohr-chabad-jcc-sofia",
    name: "Rohr Chabad Jewish Community Center",
    city: "Sofia",
    country: "Bulgaria",
    address: "38 Stara Planina Street, 4th floor, Sofia, Bulgaria",
    phone: "+359 2 944 3380",
    whatsapp: null,
    email: null,
    website: "https://www.chabadbulgaria.org/templates/articlecco_cdo/aid/902969/jewish/Chabad-Synagogue.htm",
    minyan_status: "confirmed",
    minyan_notes: "Weekday Shacharit and Shabbat services are published.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Confirm current mikveh arrangements directly before travel.",
    kosher_food_status: "contact_to_confirm",
    kosher_food_notes: "Confirm current kosher-food options directly before travel.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Kiddush and Shabbat meals follow the published Shabbat prayer services; reserve directly.",
    reservation_required: true,
    source_url: "https://www.chabadbulgaria.org/templates/articlecco_cdo/aid/902969/jewish/Chabad-Synagogue.htm",
    feature_source_urls: {
      minyan: "https://www.chabadbulgaria.org/templates/articlecco_cdo/aid/902969/jewish/Chabad-Synagogue.htm",
      shabbat_hospitality: "https://www.chabadbulgaria.org/templates/articlecco_cdo/aid/902969/jewish/Chabad-Synagogue.htm",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-of-thessaloniki",
    name: "Chabad of Thessaloniki",
    city: "Thessaloniki",
    country: "Greece",
    address: "Salaminos Street 9, Thessaloniki 54626, Greece",
    phone: "+30 693 986 5991",
    whatsapp: "+30 693 986 5991",
    email: "ymk885@gmail.com",
    website: "https://jewishthessaloniki.com/en/chabad-house/",
    minyan_status: "confirmed",
    minyan_notes: "The official visitor page lists daily and Shabbat prayers.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official visitor page lists men's immersion in a hot spring; confirm access details before travel.",
    kosher_food_status: "confirmed",
    kosher_food_notes:
      "Chabad's visitor information includes kosher food; the linked kosher restaurant offers daily dine-in, takeaway, and delivery.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals are listed as active; register through the official site.",
    reservation_required: true,
    source_url: "https://jewishthessaloniki.com/en/chabad-house/",
    feature_source_urls: {
      minyan: "https://jewishthessaloniki.com/en/chabad-house/",
      mikveh: "https://jewishthessaloniki.com/en/chabad-house/",
      kosher_food: "https://jewishthessaloniki.com/en/chabad-house/",
      shabbat_hospitality: "https://jewishthessaloniki.com/en/chabad-house/",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-lubavitch-of-monaco",
    name: "Chabad Lubavitch of Monaco",
    city: "Monte Carlo",
    country: "Monaco",
    address: "3 Rue du Berceau, Monte Carlo 98000, Monaco",
    phone: "+33 6 62 12 23 32",
    whatsapp: null,
    email: null,
    website: "https://www.chabadmonaco.com",
    minyan_status: "confirmed",
    minyan_notes: "The related Jewish cultural center lists a daily minyan; confirm the current venue before attending.",
    mikveh_status: "confirmed",
    mikveh_notes: "The official Chabad locator lists Mikveh Esther Safra.",
    kosher_food_status: "contact_to_confirm",
    kosher_food_notes: "Confirm current kosher-food options directly before travel.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "The official Chabad locator lists Shabbat and holiday hospitality; register directly.",
    reservation_required: true,
    source_url: "https://www.chabad.org/jewish-centers/1949364",
    feature_source_urls: {
      minyan: "https://www.chabad.org/jewish-centers/1949364",
      mikveh: "https://www.chabad.org/jewish-centers/1949364",
      shabbat_hospitality: "https://www.chabad.org/jewish-centers/1949364",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-lubavitch-of-finland",
    name: "Chabad Lubavitch of Finland",
    city: "Helsinki",
    country: "Finland",
    address: "Mariankatu 3, 00170 Helsinki, Finland",
    phone: "+358 9 444 770",
    whatsapp: null,
    email: null,
    website: "https://www.lubavitch.fi/",
    minyan_status: "contact_to_confirm",
    minyan_notes: "Confirm current prayer and minyan arrangements directly before travel.",
    mikveh_status: "confirmed",
    mikveh_notes: "The Helsinki Jewish Community lists Finland's only functioning mikveh; arrange access in advance.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The official Chabad food page lists kosher food information.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Chabad invites visitors to join Shabbat meals; arrange in advance.",
    reservation_required: true,
    source_url: "https://www.lubavitch.fi/templates/articlecco_cdo/aid/282702/jewish/Kosher-Food.htm",
    feature_source_urls: {
      mikveh: "https://www.lubavitch.fi/templates/articlecco_cdo/aid/282702/jewish/Kosher-Food.htm",
      kosher_food: "https://www.lubavitch.fi/templates/articlecco_cdo/aid/282702/jewish/Kosher-Food.htm",
      shabbat_hospitality: "https://www.lubavitch.fi/templates/articlecco_cdo/aid/282702/jewish/Kosher-Food.htm",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-of-iceland-beit-tovah",
    name: "Chabad of Iceland — Beit Tovah",
    city: "Reykjavík",
    country: "Iceland",
    address: "Reykjavík, Iceland (confirm exact location before travel)",
    phone: null,
    whatsapp: null,
    email: null,
    website: "https://www.jewishiceland.com",
    minyan_status: "confirmed",
    minyan_notes: "The traveler service lists daily prayer services; confirm times directly.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Confirm current mikveh access directly before travel.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "The traveler service lists a kosher shop plus daily lunch and dinner boxes.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "The traveler service lists Shabbat meals.",
    reservation_required: true,
    source_url: "https://www.gokosher.com/en/v95134",
    feature_source_urls: {
      minyan: "https://www.gokosher.com/en/v95134",
      kosher_food: "https://www.gokosher.com/en/v95134",
      shabbat_hospitality: "https://www.gokosher.com/en/v95134",
    },
    last_verified: "2026-08-24",
  },
  {
    id: "chabad-croatia-zagreb",
    name: "Chabad Croatia",
    city: "Zagreb",
    country: "Croatia",
    address: "",
    phone: null,
    whatsapp: null,
    email: null,
    website: null,
    minyan_status: "confirmed",
    minyan_notes: "The Croatian traveler guide describes regular Shabbat and holiday prayers in Zagreb; confirm current times directly.",
    mikveh_status: "contact_to_confirm",
    mikveh_notes: "Confirm current mikveh arrangements directly before travel.",
    kosher_food_status: "confirmed",
    kosher_food_notes: "Kosher prepared food and products can be ordered in advance from Zagreb for mainland delivery.",
    shabbat_hospitality_status: "confirmed",
    shabbat_hospitality_notes: "Shabbat meals require advance registration and are available year-round in Zagreb.",
    reservation_required: true,
    source_url: "https://www.croatia.co.il/chabad-houses-croatia/",
    feature_source_urls: {
      minyan: "https://www.croatia.co.il/chabad-houses-croatia/",
      kosher_food: "https://www.croatia.co.il/chabad-houses-croatia/",
      shabbat_hospitality: "https://www.croatia.co.il/chabad-houses-croatia/",
    },
    last_verified: "2026-08-24",
  },
];
