// Curated, editorial trip ideas for the honeymoon and planning pages. These are
// general destination ideas and sample day-outlines — NOT specific business
// listings. We never invent a hotel, restaurant, phone, or price here; for real
// kosher places, the pages embed the live kosher finder, and the itinerary
// planner pulls from our sourced kever directory.

export type DestinationIdea = {
  region: string;
  places: string;
  blurb: string;
};

export type SamplePlan = {
  length: string;
  title: string;
  days: string[];
  note?: string;
};

// Romantic, kosher-friendly destination ideas for honeymoons.
export const honeymoonDestinations: DestinationIdea[] = [
  { region: "Israel", places: "Jerusalem · Galilee · Tel Aviv · Dead Sea", blurb: "Kosher wherever you go, and every kind of trip in one country — the Old City and Kosel, the green Galilee and Kinneret, the coast, and the desert and Dead Sea." },
  { region: "Italy", places: "Rome · Florence · the Lakes", blurb: "Historic Jewish Rome and the old Ghetto, Renaissance cities, and the romantic northern lakes — with a kosher scene in Rome and Milan." },
  { region: "Switzerland & the Alps", places: "Lucerne · Interlaken · the mountains", blurb: "Lakes, peaks, and quiet mountain villages — a classic for couples, with seasonal kosher hotels and glatt options in the larger towns." },
  { region: "Central Europe", places: "Prague · Vienna · Budapest", blurb: "Elegant capitals rich in Jewish heritage, walkable old towns, and thermal spas — each with kosher dining to look up before you go." },
  { region: "Western Europe", places: "London · Paris · Antwerp", blurb: "Great cities with some of the strongest kosher infrastructure in the world — easy for a couple who wants culture without compromising on food." },
  { region: "Sun & sea", places: "Kosher resorts · Mediterranean · Caribbean", blurb: "Prefer a beach? Look for a kosher resort program or a kosher-catered cruise — a relaxed, all-arranged option for a honeymoon." },
];

// Sample honeymoon plans — outlines to adapt around flights and stays.
export const honeymoonPlans: SamplePlan[] = [
  {
    length: "Long weekend",
    title: "Romantic city break",
    days: [
      "Arrive, settle into a quiet boutique stay, and an easy first evening — a kosher dinner and a walk.",
      "A full day out: old town, a museum or garden, and a special reservation for the evening.",
      "A slower morning, one last outing, and fly home.",
    ],
    note: "Works for Prague, Vienna, Rome, London, or Paris.",
  },
  {
    length: "One week",
    title: "Two-part trip: city + nature",
    days: [
      "Days 1–3 — a city: heritage, dining, and evenings out.",
      "Travel day to the mountains, lakes, or coast.",
      "Days 5–6 — nature and quiet: views, a spa, unhurried time together.",
      "A final day and the journey home.",
    ],
    note: "Pair Zurich with the Alps, Tel Aviv with the Galilee, or Milan with the Italian lakes.",
  },
];

// Sample kivrei-tzaddikim trip routes for the planning page, built from places
// in our own directory. Outlines to adapt — confirm access and timing per site.
export const plannerRoutes: SamplePlan[] = [
  {
    length: "Long weekend",
    title: "Southern Poland kevarim",
    days: [
      "Arrive in Kraków — the Rema and the old Jewish quarter.",
      "Day trip south to Lizhensk (Reb Elimelech), and on to Dynow.",
      "Sanz (the Divrei Chaim) and Bobowa on the way back before flying out.",
    ],
    note: "Kraków makes an easy base with kosher food in the Kazimierz quarter.",
  },
  {
    length: "3–4 days",
    title: "Hungary & Slovakia tzaddikim",
    days: [
      "Fly into Budapest; Nagykalló (the Kaliver) to start.",
      "Bodrogkeresztúr (Reb Shayale) and Tarcal.",
      "Cross to Slovakia — Bardejov and Pressburg (the Chasam Sofer).",
    ],
    note: "A rich cluster of kevarim within a few hours' drive of each other.",
  },
  {
    length: "One week",
    title: "Ukraine kivrei tzaddikim",
    days: [
      "Uman — the Rebbe, Reb Nachman of Breslov.",
      "Medzhybizh — the Baal Shem Tov, and Berditchev.",
      "Hanipoli (Reb Zusha), and westward toward Premishlan and Sadhora.",
      "Confirm current access and safety for every site before traveling.",
    ],
    note: "Ukraine travel is wartime-sensitive — check advisories and arrange a trusted local driver.",
  },
];
