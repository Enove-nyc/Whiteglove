/**
 * The starter packing list — what anybody packs for a trip, before a trip
 * exists.
 *
 * WHY THIS EXISTS. /packing used to be a signed-in page and nothing else: it
 * asked the account for the trip in the planner and generated a list from that
 * trip's destinations, dates and stops. A visitor who had not signed in was
 * sent to the login door, and one who had signed in but had no trip yet was
 * told to go and make one. Either way the page had nothing to say to somebody
 * who simply wanted to know what to pack.
 *
 * So the page is open now, and this is what it opens with. It is deliberately
 * NOT the AI list with the trip taken out of it — a general list cannot know
 * where somebody is going, and pretending otherwise is how a checklist becomes
 * wrong. It is the part that does not depend on the destination, and the
 * tailored list stays what the planner produces from a real trip.
 *
 * PURE DATA, and hand-written rather than generated, because a fixed list on a
 * public page is a thing the site is asserting and should be readable in one
 * screen by whoever maintains it.
 *
 * ON THE SHABBOS AND FOOD LINES. They describe what a Torah-observant traveller
 * packs, not what anyone ought to do — AGENTS.md: information, not hashkafa.
 * "Candles and a fireproof tray" is a packing line; anything about where or
 * whether to light is not this file's business.
 */

export type PackingBasic = {
  id: string;
  label: string;
  category: string;
};

/**
 * Categories in the order they are shown, chosen to match the shape the
 * generated list already uses, so a visitor who signs in later meets the same
 * groupings rather than a different-looking page.
 */
export const PACKING_BASICS: readonly PackingBasic[] = [
  { id: "b-passport", label: "Passport, and a photo of it kept separately", category: "Documents" },
  { id: "b-tickets", label: "Flight and hotel confirmations", category: "Documents" },
  { id: "b-insurance", label: "Travel insurance details", category: "Documents" },
  { id: "b-cards", label: "A second payment card, packed apart from the first", category: "Documents" },
  { id: "b-licence", label: "Driving licence, if you are hiring a car", category: "Documents" },

  { id: "b-siddur", label: "Siddur", category: "Shabbos and davening" },
  { id: "b-tefillin", label: "Tallis and tefillin, in hand luggage", category: "Shabbos and davening" },
  { id: "b-candles", label: "Shabbos candles and a fireproof tray", category: "Shabbos and davening" },
  { id: "b-blech", label: "Travel blech or hotplate", category: "Shabbos and davening" },
  { id: "b-urn", label: "Travel kettle or urn", category: "Shabbos and davening" },
  { id: "b-havdalah", label: "Havdalah set", category: "Shabbos and davening" },
  { id: "b-zmanim", label: "Candle-lighting times for where you are going", category: "Shabbos and davening" },

  { id: "b-snacks", label: "Kosher snacks for the journey", category: "Food" },
  { id: "b-meals", label: "Sealed meals for the flight", category: "Food" },
  { id: "b-cutlery", label: "Disposable cutlery and plates", category: "Food" },
  { id: "b-foil", label: "Foil, cling film and food bags", category: "Food" },
  { id: "b-netilas", label: "Netilas yadayim cup", category: "Food" },

  { id: "b-adapter", label: "Plug adapter for the country you are going to", category: "Electronics" },
  { id: "b-powerbank", label: "Power bank, in hand luggage", category: "Electronics" },
  { id: "b-cables", label: "Charging cables for everything you are bringing", category: "Electronics" },

  { id: "b-meds", label: "Medication, in its original packaging", category: "Health and toiletries" },
  { id: "b-firstaid", label: "Small first-aid kit", category: "Health and toiletries" },
  { id: "b-sunscreen", label: "Sunscreen", category: "Health and toiletries" },
  { id: "b-toiletries", label: "Toiletries in travel sizes", category: "Health and toiletries" },

  { id: "b-shabbosclothes", label: "Shabbos clothes", category: "Clothing" },
  { id: "b-weather", label: "A layer for the weather where you are going", category: "Clothing" },
  { id: "b-walking", label: "Comfortable walking shoes", category: "Clothing" },
  { id: "b-laundry", label: "A bag for laundry", category: "Clothing" },
];
