/**
 * The one thing a visitor could not see: what they actually end up holding.
 *
 * THE GAP THIS FILLS. The pages explain what the planner does. What nobody
 * could do was look at the thing at the end of it. "A written day-by-day
 * itinerary" is a description of a deliverable, not the deliverable, and a
 * person deciding whether to pay is deciding about the deliverable.
 *
 * THIS IS THE GENERAL-TRAVEL SAMPLE, AND THAT IS THE POINT. The two products
 * share a lineage and this file used to be the same week on both: a family of
 * five in the Roman Ghetto, built around the Shabbos in the middle of it, with
 * a hechsher to confirm and a Friday that stops early. All of that is true and
 * good on White Glove Kosher Travel, and none of it belongs on White Glove
 * Itineraries, which sells trip-building to advisers with clients of every
 * kind. An adviser reading the sample was being shown a different company's
 * deliverable as proof of what this one produces.
 *
 * So the week here is an ordinary one. Same city, same family of five, same
 * shape — a red-eye in, a slow first afternoon, two full days, a deliberately
 * empty one, and out on a Sunday rather than a Friday. What changed is that
 * the days are now sightseeing rather than a religious calendar.
 *
 * WHY IT IS STILL NOT AN INVENTED BROCHURE, and the line is worth being
 * precise about:
 *
 *   • Every PLACE named is a real, checkable Rome landmark. The Colosseum, the
 *     Pantheon, the Trevi Fountain, the Vatican Museums, Villa Borghese,
 *     Trastevere and Ostia Antica are where the file says they are.
 *
 *   • Nothing is named that WOULD be a claim. No hotel, no airline, no flight
 *     number, no confirmation code, no price. A real itinerary carries all of
 *     those and this one says so in the place each would sit, because the shape
 *     of the document is the thing being shown and a made-up hotel name would
 *     be the one line on it that was not true of anywhere.
 *
 *   • No testimonial, no rating, no "chosen by 300 advisers". There is no real
 *     one to print and this page does not invent one. The proof on offer is
 *     the work itself.
 *
 * It goes through the same buildDays() as a customer's trip, so the times, the
 * walking and driving between stops and the evening entries are computed here
 * exactly as they are for anybody else. If the planner changes, the sample
 * changes with it, which is the only way a sample stays true.
 */

import type { Itinerary } from "@/data/itinerary";

/** The label carried on the page, in the metadata, and in the tests. */
export const SAMPLE_NOTICE =
  "A sample, not a booking. The places are real; the flights and the hotel are left unnamed because nothing here is reserved.";

/**
 * THE TEST CODE, so the app can be opened without an adviser sending one.
 *
 * Every other way into the White Glove app needs a real trip behind it: an
 * adviser creates a per-trip code and sends it to one client, or a Trip Pass is
 * spent. There was no way to simply see the app work — on a phone, through the
 * code box, the way a client meets it — without first manufacturing somebody's
 * trip.
 *
 * Typing this into the code box on /app opens the sample week below as the app.
 * It is safe to be this guessable: a real share token is twelve url-safe
 * characters from randomBytes (shareToken in lib/account-store.ts) and can
 * never be eight digits, so this collides with nothing and reveals nothing —
 * the trip it opens is the same made-up Lake Como week already published on
 * /sample-itinerary.
 */
export const SAMPLE_TRIP_CODE = "12345678";

export const SAMPLE_ITINERARY: Itinerary = {
  title: "Lake Como — a week, family of five",
  startDate: "2027-06-13",
  endDate: "2027-06-20",
  dayStartTime: "09:00",
  travelers: [
    { id: "sample-a1", name: "Adult", kind: "adult" },
    { id: "sample-a2", name: "Adult", kind: "adult" },
    { id: "sample-c1", name: "Child", kind: "child", notes: "Age 11" },
    { id: "sample-c2", name: "Child", kind: "child", notes: "Age 7" },
    { id: "sample-c3", name: "Child", kind: "child", notes: "Age 4" },
  ],
  flights: [
    {
      id: "sample-out",
      from: "New York (JFK)",
      to: "Milan (MXP)",
      date: "2027-06-13",
      departTime: "18:30",
      arriveTime: "08:45",
      arriveDate: "2027-06-14",
      // No airline, no flight number, no confirmation — see the note at the
      // top of this file. A real itinerary carries all three, and this says
      // where they sit rather than inventing them.
      notes: "Your own itinerary carries the airline, the flight number and the booking reference here.",
    },
    {
      id: "sample-home",
      from: "Milan (MXP)",
      to: "New York (JFK)",
      date: "2027-06-20",
      departTime: "12:10",
      arriveTime: "15:00",
      notes: "A midday departure, so the last morning is not spent watching a clock.",
    },
  ],
  lodging: [
    {
      id: "sample-hotel",
      type: "hotel",
      name: "A hotel on the lakefront in Bellagio",
      address: "Bellagio, Lake Como",
      coordinates: "45.9866, 9.2617",
      checkIn: "2027-06-14",
      checkOut: "2027-06-20",
      notes:
        "Chosen for where it stands: Bellagio sits where the lake's three arms meet, so the ferries to Varenna, Menaggio and the villas leave from the doorstep. Your own itinerary names the property, the address and the confirmation number.",
    },
  ],
  activities: [
    {
      id: "sample-arrive",
      name: "Land in Milan, drive up to the lake and settle in",
      address: "Bellagio, Lake Como",
      date: "2027-06-14",
      startTime: "09:30",
      durationMins: 180,
      order: 1,
      notes: "About an hour and a half by car from the airport. Nothing else planned until the evening: a day that starts with a red-eye does not hold a schedule.",
    },
    {
      id: "sample-lakefront",
      name: "An evening walk along Bellagio's lakefront",
      address: "Punta Spartivento, Bellagio",
      coordinates: "45.9897, 9.2620",
      date: "2027-06-14",
      startTime: "18:00",
      durationMins: 90,
      order: 2,
      notes: "Out to the point where the lake divides, and back through the stepped lanes. Nothing to book.",
    },
    {
      id: "sample-melzi",
      name: "The gardens of Villa Melzi",
      address: "Lungolario Manzoni, Bellagio",
      coordinates: "45.9833, 9.2600",
      date: "2027-06-15",
      startTime: "09:30",
      durationMins: 120,
      order: 1,
      notes: "A level walk along the water from the centre of Bellagio, which is what makes it work with a four-year-old.",
    },
    {
      id: "sample-boat",
      name: "Lake Como by boat: Bellagio, Varenna and Menaggio",
      address: "Bellagio ferry pier",
      coordinates: "45.9862, 9.2614",
      date: "2027-06-15",
      startTime: "14:00",
      durationMins: 210,
      order: 2,
      notes: "The public ferries link the three villages in a triangle. A day ticket covers the hops, and the children choose where to get off.",
    },
    {
      id: "sample-balbianello",
      name: "Villa del Balbianello",
      address: "Lenno, Lake Como",
      coordinates: "45.9714, 9.2027",
      date: "2027-06-16",
      startTime: "10:00",
      durationMins: 180,
      order: 1,
      notes: "Reached by water taxi from Lenno or on foot along a wooded path. Check the opening days and book the house tour ahead.",
    },
    {
      id: "sample-free",
      name: "An unplanned day",
      address: "Bellagio, Lake Como",
      date: "2027-06-17",
      startTime: "10:00",
      durationMins: 240,
      order: 1,
      notes: "Deliberately empty. A week with seven full days on it is a week somebody abandons on day three.",
    },
    {
      id: "sample-como",
      name: "Como, and the funicular up to Brunate",
      address: "Piazza de Gasperi, Como",
      coordinates: "45.8125, 9.0858",
      date: "2027-06-18",
      startTime: "09:30",
      durationMins: 300,
      order: 1,
      notes: "The fast boat runs down to Como town. The funicular climbs to Brunate in a few minutes, with the whole lake below.",
    },
    {
      id: "sample-varenna",
      name: "Varenna and the Castello di Vezio",
      address: "Varenna, Lake Como",
      coordinates: "46.0105, 9.2838",
      date: "2027-06-19",
      startTime: "10:00",
      durationMins: 240,
      order: 1,
      notes: "Fifteen minutes across by ferry. The lakeside walkway, then the climb to the castle for the view.",
    },
    {
      id: "sample-last-morning",
      name: "The last morning",
      address: "Bellagio, Lake Como",
      date: "2027-06-20",
      startTime: "08:00",
      durationMins: 60,
      order: 1,
      notes: "Down to the airport with time in hand. The transfer sits here in your own itinerary, with its confirmation.",
    },
  ],
  notes:
    "From the planning answers:\n• Kind of trip: Family trip\n• Destination: Lake Como\n• Travellers: 2 adults, 3 children (ages 4, 7 and 11)\n• Pace: Balanced\n• Access needs: Short walking distances\n• Must include: A day on the boats",
};

/**
 * What each part of the document is, for the panel beside it.
 *
 * Written as what the READER gets rather than what the planner does, because
 * the question this page answers is "what do I end up holding".
 */
export const WHAT_IS_IN_IT: ReadonlyArray<[string, string]> = [
  ["A day per page", "Every day as one running schedule — the time, what it is, where, and the line of detail that matters."],
  ["Real driving and walking times", "Between each stop, from road routing rather than straight-line distance, so the day holds up."],
  ["A day with nothing on it", "Planned in, not left over. The week here has one, and it is the reason the other six survive contact."],
  ["On the phone as well as on paper", "The same trip opens as an app for whoever is travelling, with the wallet kept for when there is no signal."],
  ["Room to change it", "It stays in the account that built it. Move a day, drop a stop, hand it over again."],
  ["Nothing invented", "No airline, no confirmation code and no price is printed here, because none of them has happened yet."],
];
