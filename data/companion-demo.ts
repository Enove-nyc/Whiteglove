/**
 * The trip the White Glove app shows before a real one is wired in.
 *
 * This is the Rome week the design was drawn around — a family of five, the
 * kosher side of each day, a Friday that stops early, an advisor who moves
 * things before anybody is asked. It is REAL, publishable Rome information
 * written in the site's voice, not lorem: the Ghetto, the Great Synagogue, the
 * Arch of Titus with the Menorah cut into it, candle-lighting on the Friday.
 *
 * WHY IT LIVES IN ITS OWN FILE. The app (components/companion/CompanionApp.tsx)
 * takes this shape as a prop, so the day a signed-in Business account's own
 * itinerary is handed in instead — built from lib/account-store.ts trips and
 * the site's own kosher / Shabbos / destination records — nothing in the app
 * changes but the data. The shape below is the contract for that hand-off.
 */

export type CompanionKind = "travel" | "sight" | "meal" | "rest" | "shabbos";

export type CompanionItem = {
  time: string;
  title: string;
  place: string;
  kind: CompanionKind;
  note: string;
  /** How far on foot, when it is worth saying. */
  walk?: string;
  /** Whether the advisor may swap this one out around weather. */
  swappable?: boolean;
};

export type CompanionDay = {
  dow: string;
  dom: string;
  short: string;
  name: string;
  weather: string;
  walk: string;
  today?: boolean;
  shabbosLabel?: string;
  shabbosNote?: string;
  items: CompanionItem[];
};

export type CompanionSwap = {
  title: string;
  note: string;
  meta: string;
  item: CompanionItem;
  reply: string;
};

export type CompanionMessage = { from: "them" | "me"; text: string };

export type CompanionHandledStep = { what: string; when: string };

export type CompanionGuideItem = { title: string; note: string; tint: string };
export type CompanionGuideSection = { name: string; items: CompanionGuideItem[] };

export type CompanionWalletRow = { title: string; ref: string; sub: string };
export type CompanionWalletGroup = { name: string; rows: CompanionWalletRow[] };

export type CompanionPref = { label: string; value: string };

export type CompanionAdvisorTrip = {
  family: string;
  where: string;
  status: string;
  statusBg: string;
  statusFg: string;
  bg: string;
  border: string;
  line: string;
  /** The one thing to do, or null when the trip is running to plan. */
  action: string | null;
  /** Which screen the action opens. */
  go?: "alerts";
};

export type CompanionTrip = {
  /**
   * Whether a live advisor is attached — the concierge side of the app.
   *
   * TRUE only for the scripted demo, which is the one place the advisor chat,
   * the held-for-you swap, the "handled for you" log and the advisor's own
   * trip list are real. A trip wired from the planner sets it FALSE: it is the
   * real itinerary in the traveller's pocket, with the guide and the wallet,
   * and nothing is put in an advisor's mouth that no advisor said. When the
   * concierge backend exists, a real trip can carry it too.
   */
  concierge: boolean;
  advisorName: string;
  /** What the home screen's header reads — the family and the place. */
  homeTitle: string;
  /** The small line above it — "27 October · day 3 of 8". */
  homeKicker: string;
  tripTitle: string;
  tripDates: string;
  /** Which day is "today" — the index the app opens on. */
  todayIndex: number;
  /** The one line under "Eating today" on the home screen. */
  /** The one "Eating today" line on the home screen. Hidden when absent. */
  kosherTitle?: string;
  kosherNote?: string;
  family: string;
  familyMeta: string;
  days: CompanionDay[];
  walletGroups: CompanionWalletGroup[];
  prefs: CompanionPref[];
  guideSections: CompanionGuideSection[];
  /* ---- concierge-only, present when `concierge` is true ---------------- */
  /** The held-for-you weather swap. */
  swaps?: { a: CompanionSwap; b: CompanionSwap };
  /** The advisor thread. Empty on a wired trip. */
  messages?: CompanionMessage[];
  /** The "handled for you" log of changes the advisor absorbed. */
  handledSteps?: CompanionHandledStep[];
  /** The advisor's own list of the trips they are holding. */
  advisorTrips?: CompanionAdvisorTrip[];
};

/** The palette the design carries with it — kept here so the app has one source. */
export const COMPANION_KIND: Record<
  CompanionKind,
  { dot: string; tint: string; label: string; fg: string }
> = {
  travel: { dot: "#78716c", tint: "#f7f5f0", label: "Travel", fg: "#57534e" },
  sight: { dot: "#b78a4a", tint: "#f7eee0", label: "On foot", fg: "#765321" },
  meal: { dot: "#15324b", tint: "#e7edf1", label: "Eating", fg: "#1f3f5c" },
  rest: { dot: "#a8a29e", tint: "#ffffff", label: "Nothing planned", fg: "#78716c" },
  shabbos: { dot: "#15324b", tint: "#e7edf1", label: "Shabbos", fg: "#1f3f5c" },
};

export const COMPANION_DEMO_TRIP: CompanionTrip = {
  concierge: true,
  advisorName: "Miriam Feldman",
  homeTitle: "The Cohens · Rome",
  homeKicker: "27 October · day 3 of 8",
  tripTitle: "Rome — a week, family of five",
  tripDates: "25 October – 1 November 2026",
  todayIndex: 2,
  kosherTitle: "Lunch back in the Ghetto, one o’clock",
  kosherNote:
    "Twenty minutes on foot from the Forum, table held. Cholov Yisroel and Glatt, as asked — confirm the hechsher close to the day.",
  family: "The Cohen family",
  familyMeta: "2 adults, 3 children · ages 4, 7, 11",
  days: [
    {
      dow: "Sun",
      dom: "25",
      short: "Fly out",
      name: "Sunday 25 October",
      weather: "Leaving JFK 18:40",
      walk: "—",
      items: [
        { time: "16:00", title: "Out to JFK", place: "Car, pre-booked", kind: "travel", note: "Two hours in hand. The transfer confirmation sits in your wallet." },
        { time: "18:40", title: "JFK → Rome (FCO)", place: "Overnight, lands 08:55", kind: "travel", note: "Kosher meals ordered for five, confirmed with the airline on the 14th." },
      ],
    },
    {
      dow: "Mon",
      dom: "26",
      short: "Arrive",
      name: "Monday 26 October",
      weather: "19°, clear",
      walk: "1.4 km on foot",
      items: [
        { time: "09:30", title: "Land, and settle in", place: "The hotel, inside the Ghetto", kind: "rest", note: "Nothing planned for the first afternoon. A day that starts with a red-eye does not hold a schedule.", walk: "10 min on foot to the quarter" },
        { time: "16:00", title: "The Ghetto and the Great Synagogue", place: "Via del Portico d'Ottavia", kind: "sight", note: "The streets you will be eating in all week." },
      ],
    },
    {
      dow: "Tue",
      dom: "27",
      short: "Colosseum",
      name: "Tuesday 27 October",
      weather: "Rain from 15:00",
      walk: "2.1 km on foot",
      today: true,
      items: [
        { time: "09:30", title: "The Colosseum", place: "Piazza del Colosseo", kind: "sight", note: "Timed entry booked. The Arch of Titus, with the Menorah on it, is a few minutes from the exit.", walk: "20 min on foot to the Ghetto" },
        { time: "13:00", title: "Back to the Ghetto for lunch", place: "Via del Portico d'Ottavia", kind: "meal", note: "Confirm the hechsher close to your dates — restaurants change hands.", walk: "12 min on foot" },
        { time: "15:30", title: "The Pantheon and the Trevi Fountain", place: "Piazza della Rotonda", kind: "sight", note: "Both are open squares and free to stand in, which is what makes them work with a four-year-old.", swappable: true },
        { time: "18:30", title: "Back to the hotel", place: "On foot through the Ghetto", kind: "rest", note: "Early night. The Vatican is a long morning." },
      ],
    },
    {
      dow: "Wed",
      dom: "28",
      short: "Vatican",
      name: "Wednesday 28 October",
      weather: "17°, cloud",
      walk: "900 m on foot",
      items: [
        { time: "09:00", title: "Vatican Museums", place: "Viale Vaticano", kind: "sight", note: "The longest single thing on the trip — three and a half hours. Nothing after it, on purpose." },
        { time: "13:30", title: "Lunch back in the quarter", place: "Ghetto", kind: "meal", note: "Twenty-five minutes by taxi, held for you at 13:15." },
      ],
    },
    {
      dow: "Thu",
      dom: "29",
      short: "Open",
      name: "Thursday 29 October",
      weather: "20°, sun",
      walk: "Yours",
      items: [
        { time: "10:00", title: "An unplanned afternoon", place: "Rome", kind: "rest", note: "Deliberately empty. A week with seven full days on it is a week somebody abandons on day three." },
      ],
    },
    {
      dow: "Fri",
      dom: "30",
      short: "Erev Shabbos",
      name: "Friday 30 October",
      weather: "18°, clear",
      walk: "600 m on foot",
      shabbosLabel: "Candle-lighting 16:52",
      shabbosNote: "The day is built to finish early. Everything is inside the quarter, so nobody is walking far as it comes in.",
      items: [
        { time: "10:00", title: "Shopping for Shabbos", place: "Via del Portico d'Ottavia", kind: "meal", note: "Two hours and a half. Everything on the list is within the quarter." },
        { time: "14:30", title: "Back to the hotel", place: "Ghetto", kind: "rest", note: "Two hours in hand before candle-lighting." },
      ],
    },
    {
      dow: "Sat",
      dom: "31",
      short: "Shabbos",
      name: "Saturday 31 October",
      weather: "18°, clear",
      walk: "All within the quarter",
      shabbosLabel: "Shabbos",
      shabbosNote: "No times and nothing scheduled, on purpose. Everything is within the quarter you are staying in — which is the whole reason the hotel was chosen for where it stands.",
      items: [
        { time: "", title: "Shabbos in the Ghetto", place: "The Great Synagogue, four minutes on foot", kind: "shabbos", note: "The app does not ask anything of you today." },
      ],
    },
    {
      dow: "Sun",
      dom: "01",
      short: "Home",
      name: "Sunday 1 November",
      weather: "Leaving FCO 13:05",
      walk: "—",
      items: [
        { time: "08:00", title: "The last morning", place: "Rome", kind: "rest", note: "Out to the airport with time in hand. The transfer moved with the flight." },
        { time: "13:05", title: "Rome (FCO) → JFK", place: "Lands 16:55", kind: "travel", note: "Moved by the airline from 11:20. Reconfirmed Monday morning." },
      ],
    },
  ],
  swaps: {
    a: {
      title: "Move it to Thursday morning",
      note: "The Pantheon and Trevi at 09:30 on the free morning. This afternoon goes back to being yours.",
      meta: "held until 17:00 · nothing else moves",
      item: { time: "15:30", title: "Your own afternoon", place: "The hotel, or the quarter", kind: "rest", note: "Moved to Thursday 09:30. The rain has the afternoon." },
      reply: "Done — the Pantheon and Trevi are on Thursday at 09:30, and this afternoon is yours. I left the lunch where it was.",
    },
    b: {
      title: "Palazzo Massimo instead",
      note: "Indoors, twelve minutes on foot from where you finish lunch, and quiet at that hour. The mosaics hold a seven-year-old.",
      meta: "held until 17:00 · tickets on me",
      item: { time: "15:30", title: "Palazzo Massimo alle Terme", place: "Largo di Villa Peretti", kind: "sight", note: "Indoors and twelve minutes on foot from lunch. Tickets are in your wallet." },
      reply: "Booked — Palazzo Massimo at 15:30, tickets are in your wallet. Twelve minutes on foot from lunch, all of it under cover.",
    },
  },
  messages: [
    { from: "them", text: "Morning — your Colosseum entry is 09:30, and I have someone meeting you at the gate rather than in the queue." },
    { from: "me", text: "Perfect. Is the lunch place the one you sent last week?" },
    { from: "them", text: "It is, and I called them Sunday to confirm the hechsher for your dates. Table held from one." },
  ],
  handledSteps: [
    { what: "Airline moved FCO → JFK to 13:05", when: "Sunday 23:41" },
    { what: "Seats for five re-held together", when: "Monday 07:04" },
    { what: "Airport transfer moved to 09:40", when: "Monday 07:16" },
    { what: "Kosher meals reconfirmed on the new flight", when: "Monday 07:20" },
  ],
  guideSections: [
    {
      name: "Kosher, near you",
      items: [
        { title: "Lunch in the Ghetto", note: "Twenty minutes on foot from the Forum. Confirm the hechsher close to your dates — restaurants change hands.", tint: "#e7edf1" },
        { title: "Shopping for Shabbos", note: "Everything on the usual list is within the quarter, a few minutes from the hotel.", tint: "#e7edf1" },
      ],
    },
    {
      name: "Shabbos here",
      items: [
        { title: "Candle-lighting, Friday", note: "16:52 this week. The planner flags a Friday that runs into it — build the afternoon around that.", tint: "#ffffff" },
        { title: "The Great Synagogue", note: "Four minutes on foot from the quarter. The Arch of Titus nearby carries the Menorah cut into it.", tint: "#ffffff" },
      ],
    },
    {
      name: "Nearby, worth the walk",
      items: [
        { title: "The Colosseum", note: "Book the timed entry ahead. The Arch of Titus is a few minutes from the exit.", tint: "#f7eee0" },
        { title: "The Pantheon and Trevi Fountain", note: "Both are open squares, free to stand in — the kind of stop that works with small children.", tint: "#f7eee0" },
      ],
    },
  ],
  walletGroups: [
    {
      name: "Flights",
      rows: [
        { title: "JFK → Rome (FCO)", ref: "ref ●●●●", sub: "Sun 25 Oct, 18:40 · kosher meals for five, confirmed" },
        { title: "Rome (FCO) → JFK", ref: "ref ●●●●", sub: "Sun 1 Nov, 13:05 · moved from 11:20 by the airline" },
      ],
    },
    {
      name: "Where you are staying",
      rows: [
        { title: "A hotel inside the Ghetto", ref: "conf ●●●●", sub: "26 Oct – 1 Nov · chosen for where it stands, four minutes from the shul" },
      ],
    },
    {
      name: "Held for you",
      rows: [
        { title: "Colosseum, timed entry", ref: "5 tickets", sub: "Tue 27 Oct, 09:30 · guide meets you at the gate" },
        { title: "Vatican Museums", ref: "5 tickets", sub: "Wed 28 Oct, 09:00 · skip the outer queue" },
        { title: "Airport transfers", ref: "2 cars", sub: "Both moved when the flight moved" },
      ],
    },
  ],
  prefs: [
    { label: "Kind of trip", value: "Family trip" },
    { label: "Kosher", value: "Cholov Yisroel · Glatt, Beis Yosef" },
    { label: "Shabbos", value: "Walking distance to a minyan" },
    { label: "Pace", value: "Balanced" },
    { label: "Access", value: "Short walking distances" },
  ],
  advisorTrips: [
    {
      family: "The Cohen family",
      where: "Rome · day 3 of 8",
      status: "Needs you",
      statusBg: "#f7eee0",
      statusFg: "#765321",
      bg: "#ffffff",
      border: "rgba(183,138,74,.3)",
      line: "Rain from three. Two afternoons drafted and held until five — send them and let them pick.",
      action: "Send the two options",
      go: "alerts",
    },
    {
      family: "The Adler family",
      where: "Zurich · arriving Thursday",
      status: "To plan",
      statusBg: "#ece8df",
      statusFg: "#57534e",
      bg: "#ffffff",
      border: "rgba(38,50,58,.08)",
      line: "Friday lands at 14:10 and candle-lighting is 16:34. The transfer needs to be the early one.",
      action: null,
    },
    {
      family: "The Weiss family",
      where: "Rome · home Sunday",
      status: "To plan",
      statusBg: "#e7edf1",
      statusFg: "#1f3f5c",
      bg: "#ffffff",
      border: "rgba(38,50,58,.08)",
      line: "Nothing outstanding. Printed itinerary went out on the 12th.",
      action: null,
    },
  ],
};
