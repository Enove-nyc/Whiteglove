/**
 * The one thing a visitor could not see: what they actually end up holding.
 *
 * THE GAP THIS FILLS. The services page explains the process well — send us
 * the answers, we come back with directions, you pick one, we build it. What
 * nobody could do was look at the thing at the end of that. "A written
 * day-by-day itinerary" is a description of a deliverable, not the deliverable,
 * and a person deciding whether to write in is deciding about the deliverable.
 *
 * WHY THIS IS NOT AN INVENTED TESTIMONIAL, and the line is worth being precise
 * about, because the site's whole argument is that what it prints has been
 * checked:
 *
 *   • Every PLACE named here is a record the site already holds and publishes
 *     with a source — the four Rome attractions in data/attractions.ts, the
 *     Ghetto quarter and its published shul coordinate in data/kosher-stays.ts,
 *     the one eatery in data/kosher-eateries.ts. Nothing is named that the site
 *     would not name on its own destination page.
 *
 *   • Nothing is named that WOULD be a claim. No hotel, no airline, no flight
 *     number, no confirmation code, no price. A real itinerary carries all of
 *     those and this one says so in the place each would sit, because the shape
 *     of the document is the thing being shown and a made-up hotel name would
 *     be the one line on it that was not true of anywhere.
 *
 *   • The dates are a real week of a stated year, so the Friday is a Friday
 *     and the Shabbos falls where the document says it does. They are
 *     illustrative and the page says so, twice.
 *
 * It is rendered through exactly the same engine as a real trip — buildDays(),
 * buildPrintTimeline(), PrintableItinerary — so what is on the page is what the
 * planner produces rather than a mock-up of it. If the printed document changes,
 * this changes with it, which is the only way a sample stays honest.
 *
 * THE TRIP IS DELIBERATELY ORDINARY: a week in Rome for a family of five. A
 * sample built to show off would be a worse answer to "what do I get" than one
 * built to show the normal case — which includes a day with nothing on it, a
 * Friday that stops early, and a Shabbos with no schedule at all. Those three
 * are the parts an ordinary travel itinerary gets wrong, so they are the parts
 * worth showing.
 */

import type { Itinerary } from "@/data/itinerary";

/** The label carried on the page, in the metadata, and in the tests. */
export const SAMPLE_NOTICE =
  "A sample, not a booking. The places are real records from this site; the flights and the hotel are left unnamed because nothing here is reserved.";

export const SAMPLE_ITINERARY: Itinerary = {
  title: "Rome — a week, family of five",
  startDate: "2026-10-25",
  // The week is built around the Shabbos in the middle of it rather than
  // stopping before one. A sample that flies home on the Friday hides the part
  // of a trip this site exists for.
  endDate: "2026-11-01",
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
      to: "Rome (FCO)",
      date: "2026-10-25",
      departTime: "18:40",
      arriveTime: "08:55",
      arriveDate: "2026-10-26",
      // No airline, no flight number, no confirmation — see the note at the
      // top of this file. A real itinerary carries all three, and this says
      // where they sit rather than inventing them.
      notes: "Your own itinerary carries the airline, the flight number and the booking reference here.",
    },
    {
      id: "sample-home",
      from: "Rome (FCO)",
      to: "New York (JFK)",
      date: "2026-11-01",
      departTime: "11:20",
      arriveTime: "15:10",
      notes: "Sunday rather than Friday, so nobody is in an airport as Shabbos comes in.",
    },
  ],
  lodging: [
    {
      id: "sample-hotel",
      type: "hotel",
      name: "A hotel inside the Ghetto",
      address: "Rome",
      coordinates: "41.8921, 12.4780",
      checkIn: "2026-10-26",
      checkOut: "2026-11-01",
      notes:
        "Chosen for where it stands rather than for its rating: inside the quarter around the Great Synagogue, so Shabbos works on foot. Your own itinerary names the property, the address and the confirmation number.",
    },
  ],
  activities: [
    {
      id: "sample-arrive",
      name: "Land, and settle in",
      address: "Rome",
      date: "2026-10-26",
      startTime: "09:30",
      durationMins: 180,
      order: 1,
      notes: "Nothing planned for the first afternoon. A day that starts with a red-eye does not hold a schedule.",
    },
    {
      id: "sample-ghetto",
      name: "The Ghetto and the Great Synagogue",
      address: "Via del Portico d'Ottavia, Rome",
      coordinates: "41.8921, 12.4780",
      date: "2026-10-26",
      startTime: "16:00",
      durationMins: 90,
      order: 2,
      href: "/destinations/rome",
      notes: "Ten minutes on foot from where you are staying. The streets you will be eating in all week.",
    },
    {
      id: "sample-colosseum",
      name: "The Colosseum",
      address: "Piazza del Colosseo, Rome",
      coordinates: "41.8902, 12.4922",
      date: "2026-10-27",
      startTime: "09:30",
      durationMins: 150,
      order: 1,
      notes: "Book the timed entry ahead. The Arch of Titus, with the Menorah on it, is a few minutes' walk from the exit.",
    },
    {
      id: "sample-lunch",
      name: "Back to the Ghetto for lunch",
      address: "Via del Portico d'Ottavia, Rome",
      coordinates: "41.8921, 12.4780",
      date: "2026-10-27",
      startTime: "13:00",
      durationMins: 75,
      order: 2,
      notes:
        "Twenty minutes on foot from the Forum. Confirm the hechsher of whichever place you use close to your dates — restaurants change hands.",
    },
    {
      id: "sample-pantheon",
      name: "The Pantheon and the Trevi Fountain",
      address: "Piazza della Rotonda, Rome",
      coordinates: "41.8986, 12.4769",
      date: "2026-10-27",
      startTime: "15:30",
      durationMins: 120,
      order: 3,
      notes: "Both are open squares and free to stand in, which is what makes them work with a four-year-old.",
    },
    {
      id: "sample-vatican",
      name: "Vatican Museums",
      address: "Viale Vaticano, Rome",
      coordinates: "41.9065, 12.4536",
      date: "2026-10-28",
      startTime: "09:00",
      durationMins: 210,
      order: 1,
      notes: "The longest single thing on the trip. Put it on a day with nothing after it.",
    },
    {
      id: "sample-free",
      name: "An unplanned afternoon",
      address: "Rome",
      date: "2026-10-29",
      startTime: "10:00",
      durationMins: 240,
      order: 1,
      notes:
        "Deliberately empty. A week with seven full days on it is a week somebody abandons on day three.",
    },
    {
      id: "sample-erev-shabbos",
      name: "Shopping for Shabbos, and back before candle-lighting",
      address: "Via del Portico d'Ottavia, Rome",
      coordinates: "41.8921, 12.4780",
      date: "2026-10-30",
      startTime: "10:00",
      durationMins: 150,
      order: 1,
      notes:
        "The planner warns when a Friday runs into candle-lighting — this is the day that check is for. Confirm the times for your own dates.",
    },
    {
      id: "sample-shabbos",
      name: "Shabbos in the Ghetto",
      address: "Via del Portico d'Ottavia, Rome",
      coordinates: "41.8921, 12.4780",
      date: "2026-10-31",
      order: 1,
      notes:
        "No times and nothing scheduled, on purpose. Everything is within the quarter you are staying in, which is the whole reason the hotel was chosen for where it stands.",
    },
    {
      id: "sample-last-morning",
      name: "The last morning",
      address: "Rome",
      date: "2026-11-01",
      startTime: "08:00",
      durationMins: 60,
      order: 1,
      notes: "Out to the airport with time in hand. The transfer sits here in your own itinerary, with its confirmation.",
    },
  ],
  notes:
    "From your planning answers:\n• Kind of trip: Family trip\n• Destination: Rome\n• Travelers: 2 adults, 3 children (ages 4, 7 and 11)\n• Kosher standards: Cholov Yisroel, Glatt / Beis Yosef meat\n• Shabbos: Walking distance to a minyan\n• Pace: Balanced\n• Access needs: Short walking distances",
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
  ["The kosher side, per day", "Where you are eating, how far it is from where you are standing, and what to bring."],
  ["A Friday that stops early", "The planner flags a day that runs into candle-lighting. That is what the last day here is showing."],
  ["Room to change it", "It arrives in your account on this site as well as on paper. Move a day, drop a stop, print it again."],
  ["Nothing invented", "Every place named is a record this site publishes with a source. Where we hold nothing, the page says so."],
];
