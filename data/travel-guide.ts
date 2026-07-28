// Content for the travel guide: entry documents and paying for the trip.
//
// IMPORTANT: entry rules change constantly and getting them wrong can strand a
// traveler at a border. So this file does NOT state visa requirements. It gives
// each destination country's OFFICIAL source, and the questions to ask, and
// sends the traveler there. Live safety levels come from the State Department
// feed; live per-passport visa rules need a licensed provider (see below).

export type CountryDocs = {
  country: string;
  /** Official government page for entry requirements. */
  officialUrl: string;
  /** The State Department's own country information page. */
  stateDeptUrl: string;
  note?: string;
};

// One entry per country we send travelers to. Links only — no rules restated.
export const COUNTRY_DOCS: CountryDocs[] = [
  { country: "Poland", officialUrl: "https://www.gov.pl/web/diplomacy", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Poland.html" },
  { country: "Ukraine", officialUrl: "https://mfa.gov.ua/en", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Ukraine.html", note: "Wartime conditions. Border crossings, curfews and martial-law rules change frequently." },
  { country: "Israel", officialUrl: "https://www.gov.il/en/departments/topics/entry_to_israel", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/IsraeltheWestBankandGaza.html", note: "Most visa-waiver visitors must hold an approved ETA-IL before boarding. Confirm on the official page." },
  { country: "Hungary", officialUrl: "https://konzuliszolgalat.kormany.hu/en", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Hungary.html" },
  { country: "Slovakia", officialUrl: "https://www.mzv.sk/en/web/en", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Slovakia.html" },
  { country: "Czechia", officialUrl: "https://mzv.gov.cz/jnp/en/index.html", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/CzechRepublic.html" },
  { country: "Lithuania", officialUrl: "https://www.urm.lt/default/en/", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Lithuania.html" },
  { country: "Belarus", officialUrl: "https://mfa.gov.by/en/", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Belarus.html", note: "Entry rules and permitted crossing points change with little notice." },
  { country: "Romania", officialUrl: "https://www.mae.ro/en", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Romania.html" },
  { country: "Moldova", officialUrl: "https://mfa.gov.md/en", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Moldova.html" },
  { country: "Austria", officialUrl: "https://www.bmeia.gv.at/en/", stateDeptUrl: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Austria.html" },
];

// The checks that actually catch people out, whatever the destination.
export const DOCUMENT_CHECKLIST = [
  { title: "Passport validity", text: "Many countries require your passport to stay valid for six months beyond your return date. Check the expiry now, not the week before." },
  { title: "Blank pages", text: "Some borders require one or two completely blank pages for stamps. A full passport can be refused." },
  { title: "Visa or travel authorisation", text: "Some destinations need a visa; others need an electronic authorisation applied for in advance. These are separate things, and the rule depends on the passport you hold — confirm on the official page for your destination." },
  { title: "Onward or return ticket", text: "Airlines are often required to check that you hold onward travel before they let you board." },
  { title: "The airline decides at the gate", text: "Even with the right paperwork, the carrier makes the final call on boarding. Have documents on paper as well as on your phone." },
  { title: "Copies", text: "Keep a photo of your passport, visa and insurance somewhere you can reach without your bag." },
];

export type PaymentTopic = { title: string; text: string };

// Paying for the trip. General practice, not product recommendations.
export const PAYMENT_GUIDE: PaymentTopic[] = [
  { title: "Points or cash — decide per leg", text: "Points usually go furthest on long-haul premium cabins and on expensive last-minute dates. Short cheap hops are often better paid in cash. Work it out leg by leg rather than for the whole trip." },
  { title: "Know what your points are worth", text: "Divide the cash price of the ticket by the miles required. If a $900 fare costs 45,000 miles plus $90 in taxes, you're getting about 1.8 cents per mile. Compare that against what you'd normally expect from that program before redeeming." },
  { title: "Award seats are inventory, not price", text: "Award space is released in limited quantities and disappears. If you find the seats you need for a yahrzeit date, that is usually the moment to book — award tickets are typically far easier to change or cancel than cheap cash fares." },
  { title: "Transfer points only when you're ready to book", text: "Transfers from a card program to an airline are almost always one-way and irreversible. Confirm the award space is actually there first, then transfer, then book." },
  { title: "Foreign transaction fees", text: "A card without foreign transaction fees typically saves around 3% on everything you spend abroad. Over a two-week trip that is real money." },
  { title: "Pay in the local currency", text: "If a card machine offers to charge you in dollars instead of the local currency, decline. That conversion is done at a poor rate set by the terminal, not by your card." },
  { title: "Cash still matters", text: "Drivers, shomrim, small guesthouses and cemetery caretakers in Eastern Europe often take cash only. Carry some local currency and small notes." },
  { title: "Tell your bank where you're going", text: "Card blocks in the middle of a trip are common and painful. A travel notice, or a second card kept separately, avoids a bad evening." },
];
