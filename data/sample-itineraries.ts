import type { ItinActivity, Itinerary } from "@/data/itinerary";

/**
 * Public sample itineraries anyone can read and copy into the planner
 * (owner, 19 November 2026: yes to public sample-itinerary pages).
 *
 * WHY THEY EXIST. With the directory admin-only, the public site was a home
 * page, a planner and partner links — nothing a person searching "three days in
 * Rome" would ever find. Each of these is a page people search for and a
 * straight way into the planner, with the partner searches beside it.
 *
 * THE SAME RULE AS THE LAKE COMO SAMPLE (data/sample-itinerary.ts): every PLACE
 * is a real landmark at its real coordinates, and nothing is named that would
 * be a claim about a booking — no hotel, no airline, no flight number, no
 * price. Where a stay would sit, the trip names the AREA to stay in, and the
 * page offers the partner search for it.
 *
 * Dates are a placeholder week; "Copy into my planner" moves the whole trip to
 * start a month from the day it is copied (shiftItinerary below).
 */

export type SampleItinerary = {
  slug: string;
  city: string;
  country: string;
  /** What a person searches for, and the page's heading. */
  title: string;
  /** One line for the index card and the search result. */
  summary: string;
  /** A short paragraph above the days. */
  intro: string;
  /** Where to stay, as an area — what the hotel search is run for. */
  stayArea: string;
  /** The airport to fly into, as the flight search's "To" box reads it. */
  airport: string;
  itinerary: Itinerary;
};

type Stop = [date: string, time: string, minutes: number, name: string, address: string, coordinates: string, notes: string];

function stops(prefix: string, rows: Stop[]): ItinActivity[] {
  const order = new Map<string, number>();
  return rows.map(([date, startTime, durationMins, name, address, coordinates, notes], i) => {
    const n = (order.get(date) ?? 0) + 1;
    order.set(date, n);
    return { id: `${prefix}-${i + 1}`, date, startTime, durationMins, order: n, name, address, coordinates, notes };
  });
}

export const SAMPLE_ITINERARIES: SampleItinerary[] = [
  {
    slug: "three-days-in-rome",
    city: "Rome",
    country: "Italy",
    title: "Three days in Rome",
    summary: "Ancient Rome, the Vatican and the old centre on foot, with a slower last morning.",
    intro:
      "Three full days, grouped so each one stays in one part of the city: the ancient centre, the Vatican, then the piazzas, Trastevere and the Jewish Quarter. Most of it is walkable from a stay near Piazza Navona or the Pantheon.",
    stayArea: "Rome historic centre",
    airport: "Rome (FCO)",
    itinerary: {
      title: "Three days in Rome",
      startDate: "2027-05-04",
      endDate: "2027-05-07",
      dayStartTime: "09:00",
      travelers: [],
      flights: [],
      lodging: [
        {
          id: "rome-stay",
          type: "hotel",
          name: "Your hotel near Piazza Navona",
          address: "Piazza Navona, Rome",
          coordinates: "41.8992, 12.4731",
          checkIn: "2027-05-04",
          checkOut: "2027-05-07",
          notes: "The historic centre puts the Pantheon, Trevi and Trastevere within a walk. Your own itinerary names the property and the booking reference.",
        },
      ],
      activities: stops("rome", [
        ["2027-05-04", "09:00", 180, "The Colosseum", "Piazza del Colosseo, Rome", "41.8902, 12.4922", "Timed entry; book ahead, and the combined ticket covers the Forum and the Palatine."],
        ["2027-05-04", "12:30", 150, "The Roman Forum and the Palatine Hill", "Via della Salara Vecchia, Rome", "41.8925, 12.4853", "Same ticket as the Colosseum. Little shade, so take water."],
        ["2027-05-04", "16:30", 60, "Piazza Venezia and the Capitoline Hill", "Piazza del Campidoglio, Rome", "41.8933, 12.4828", "Michelangelo's square, and the view back over the Forum."],
        ["2027-05-05", "09:00", 210, "The Vatican Museums and the Sistine Chapel", "Viale Vaticano, Rome", "41.9065, 12.4536", "Book a timed entry; the queue without one can take hours. Shoulders and knees covered."],
        ["2027-05-05", "13:30", 90, "St Peter's Basilica", "Piazza San Pietro, Vatican City", "41.9022, 12.4539", "Free to enter; the climb to the dome is ticketed."],
        ["2027-05-05", "16:00", 60, "Castel Sant'Angelo and the bridge of angels", "Lungotevere Castello 50, Rome", "41.9031, 12.4663", "Walk back towards the centre across Ponte Sant'Angelo."],
        ["2027-05-06", "09:00", 45, "The Pantheon", "Piazza della Rotonda, Rome", "41.8986, 12.4769", "Ticketed entry; it opens early and is quietest first thing."],
        ["2027-05-06", "10:00", 45, "The Trevi Fountain", "Piazza di Trevi, Rome", "41.9009, 12.4833", "Busy all day; earlier is calmer."],
        ["2027-05-06", "11:00", 45, "The Spanish Steps", "Piazza di Spagna, Rome", "41.9060, 12.4828", "Sitting on the steps is not allowed; the view from the top is the point."],
        ["2027-05-06", "14:00", 120, "The Jewish Quarter and the Great Synagogue", "Via Catalana, Rome", "41.8919, 12.4776", "The synagogue and the Jewish Museum of Rome are visited together by guided tour; closed on Saturdays and Jewish holidays."],
        ["2027-05-06", "17:00", 120, "Trastevere and Santa Maria in Trastevere", "Piazza di Santa Maria in Trastevere, Rome", "41.8894, 12.4700", "Across the river on foot: narrow lanes and one of Rome's oldest churches."],
        ["2027-05-07", "09:30", 90, "Piazza Navona, and a last walk", "Piazza Navona, Rome", "41.8992, 12.4731", "A slow morning before checking out and heading to the airport."],
      ]),
    },
  },
  {
    slug: "four-days-in-paris",
    city: "Paris",
    country: "France",
    title: "Four days in Paris",
    summary: "The Louvre, the Eiffel Tower, the islands, Montmartre and the Marais, one area a day.",
    intro:
      "Four days that each keep to one side of the city, so more of the time is spent looking than travelling: the islands and the Left Bank, the Louvre and the Tuileries, the Eiffel Tower and the Seine, then Montmartre and the Marais.",
    stayArea: "Le Marais, Paris",
    airport: "Paris (CDG)",
    itinerary: {
      title: "Four days in Paris",
      startDate: "2027-05-11",
      endDate: "2027-05-15",
      dayStartTime: "09:00",
      travelers: [],
      flights: [],
      lodging: [
        {
          id: "paris-stay",
          type: "hotel",
          name: "Your hotel in the Marais",
          address: "Le Marais, Paris",
          coordinates: "48.8566, 2.3622",
          checkIn: "2027-05-11",
          checkOut: "2027-05-15",
          notes: "Central, walkable to the islands and the Louvre, and well served by the Métro. Your own itinerary names the property and the booking reference.",
        },
      ],
      activities: stops("paris", [
        ["2027-05-11", "09:30", 90, "Notre-Dame Cathedral", "6 Parvis Notre-Dame, Paris", "48.8530, 2.3499", "Reopened after the restoration; entry is free and a timed slot shortens the wait."],
        ["2027-05-11", "11:15", 60, "Sainte-Chapelle", "10 Boulevard du Palais, Paris", "48.8554, 2.3450", "The stained glass is best on a bright morning. Ticketed, with security at the Palais de Justice."],
        ["2027-05-11", "14:30", 120, "The Latin Quarter and the Luxembourg Gardens", "Jardin du Luxembourg, Paris", "48.8462, 2.3372", "Through the Left Bank's streets to the gardens, with room to sit."],
        ["2027-05-12", "09:00", 210, "The Louvre", "Rue de Rivoli, Paris", "48.8606, 2.3376", "Book a timed entry and pick two or three wings rather than trying to see it all."],
        ["2027-05-12", "13:30", 90, "The Tuileries Garden and Place de la Concorde", "Jardin des Tuileries, Paris", "48.8635, 2.3275", "A flat walk west from the Louvre."],
        ["2027-05-12", "15:30", 120, "Musée d'Orsay", "1 Rue de la Légion d'Honneur, Paris", "48.8600, 2.3266", "Across the river from the Tuileries; the Impressionists are on the top floor."],
        ["2027-05-13", "09:30", 150, "The Eiffel Tower", "Champ de Mars, Paris", "48.8584, 2.2945", "Book the lift ahead for a set time; the stairs to the second floor are an option for the energetic."],
        ["2027-05-13", "13:00", 60, "Trocadéro", "Place du Trocadéro, Paris", "48.8616, 2.2893", "The classic view of the tower from across the river."],
        ["2027-05-13", "15:00", 75, "A boat on the Seine", "Port de la Conférence, Paris", "48.8638, 2.3058", "An hour past the monuments from the river; several companies sail from here."],
        ["2027-05-13", "17:00", 60, "The Arc de Triomphe and the Champs-Élysées", "Place Charles de Gaulle, Paris", "48.8738, 2.2950", "Reach the arch by the underpass, not across the roundabout."],
        ["2027-05-14", "09:30", 150, "Montmartre and the Sacré-Cœur", "35 Rue du Chevalier de la Barre, Paris", "48.8867, 2.3431", "The funicular saves the steepest climb. The basilica is free."],
        ["2027-05-14", "14:30", 150, "The Marais and Place des Vosges", "Place des Vosges, Paris", "48.8556, 2.3655", "Old streets, small museums and the city's oldest planned square, close to where you stay."],
        ["2027-05-15", "09:30", 90, "A last walk by the Seine", "Île Saint-Louis, Paris", "48.8517, 2.3567", "A quiet island morning before checking out."],
      ]),
    },
  },
  {
    slug: "four-days-in-london",
    city: "London",
    country: "United Kingdom",
    title: "Four days in London",
    summary: "Westminster, the Tower, the great free museums and a day by the river.",
    intro:
      "Four days built around London's neighbourhoods, with the big free museums used to fill the gaps. Westminster and the royal parks, the City and the Tower, Bloomsbury and the South Bank, then South Kensington.",
    stayArea: "Covent Garden, London",
    airport: "London (LHR)",
    itinerary: {
      title: "Four days in London",
      startDate: "2027-05-18",
      endDate: "2027-05-22",
      dayStartTime: "09:00",
      travelers: [],
      flights: [],
      lodging: [
        {
          id: "london-stay",
          type: "hotel",
          name: "Your hotel near Covent Garden",
          address: "Covent Garden, London",
          coordinates: "51.5117, -0.1240",
          checkIn: "2027-05-18",
          checkOut: "2027-05-22",
          notes: "Central and walkable to Westminster, the National Gallery and the South Bank. Your own itinerary names the property and the booking reference.",
        },
      ],
      activities: stops("london", [
        ["2027-05-18", "09:30", 120, "Westminster Abbey", "20 Deans Yard, London", "51.4994, -0.1273", "Ticketed for visitors; closed to sightseeing on Sundays."],
        ["2027-05-18", "12:00", 45, "The Houses of Parliament and Big Ben", "Parliament Square, London", "51.4995, -0.1248", "Seen from the square and from Westminster Bridge."],
        ["2027-05-18", "13:30", 90, "St James's Park to Buckingham Palace", "The Mall, London", "51.5014, -0.1419", "Through the park to the palace; check the date if you want the Changing of the Guard."],
        ["2027-05-18", "16:00", 90, "The National Gallery and Trafalgar Square", "Trafalgar Square, London", "51.5089, -0.1283", "Free to enter."],
        ["2027-05-19", "09:00", 180, "The Tower of London", "Tower Hill, London", "51.5081, -0.0759", "Go straight to the Crown Jewels at opening, before the queue builds."],
        ["2027-05-19", "12:30", 45, "Tower Bridge", "Tower Bridge Road, London", "51.5055, -0.0754", "Walk across; the high walkways are ticketed."],
        ["2027-05-19", "14:00", 90, "Borough Market", "8 Southwark Street, London", "51.5055, -0.0910", "Along the river on the south side; busiest at lunchtime."],
        ["2027-05-19", "16:00", 90, "St Paul's Cathedral", "St Paul's Churchyard, London", "51.5138, -0.0984", "Cross by the Millennium Bridge. Ticketed; the galleries are a climb."],
        ["2027-05-20", "09:30", 180, "The British Museum", "Great Russell Street, London", "51.5194, -0.1270", "Free to enter. Pick a few rooms rather than the whole building."],
        ["2027-05-20", "14:00", 120, "Tate Modern and the South Bank", "Bankside, London", "51.5076, -0.0994", "Free to enter, then west along the river."],
        ["2027-05-20", "16:30", 60, "The London Eye", "Riverside Building, County Hall, London", "51.5033, -0.1196", "Book a time; a full turn takes about half an hour."],
        ["2027-05-21", "09:30", 150, "The Natural History Museum", "Cromwell Road, London", "51.4967, -0.1764", "Free to enter; the whale and the dinosaurs are the draw for children."],
        ["2027-05-21", "12:30", 90, "The Victoria and Albert Museum", "Cromwell Road, London", "51.4966, -0.1722", "Free, next door."],
        ["2027-05-21", "14:30", 120, "Hyde Park and Kensington Gardens", "Hyde Park, London", "51.5073, -0.1657", "A long walk, or rowing boats on the Serpentine in summer."],
        ["2027-05-22", "09:30", 90, "Covent Garden", "Covent Garden Piazza, London", "51.5117, -0.1240", "The market hall and street performers, before checking out."],
      ]),
    },
  },
  {
    slug: "three-days-in-barcelona",
    city: "Barcelona",
    country: "Spain",
    title: "Three days in Barcelona",
    summary: "Gaudí's buildings, the Gothic Quarter and Montjuïc, at a pace that leaves time to sit.",
    intro:
      "Three days split between Gaudí's Eixample, the old city and the hill of Montjuïc. The Sagrada Família and Park Güell both run on timed tickets, so book those two first and build around them.",
    stayArea: "Eixample, Barcelona",
    airport: "Barcelona (BCN)",
    itinerary: {
      title: "Three days in Barcelona",
      startDate: "2027-05-25",
      endDate: "2027-05-28",
      dayStartTime: "09:00",
      travelers: [],
      flights: [],
      lodging: [
        {
          id: "barcelona-stay",
          type: "hotel",
          name: "Your hotel in the Eixample",
          address: "Eixample, Barcelona",
          coordinates: "41.3930, 2.1630",
          checkIn: "2027-05-25",
          checkOut: "2027-05-28",
          notes: "Between the Gaudí houses and the old city, on wide, flat streets. Your own itinerary names the property and the booking reference.",
        },
      ],
      activities: stops("barcelona", [
        ["2027-05-25", "09:00", 120, "The Sagrada Família", "Carrer de Mallorca 401, Barcelona", "41.4036, 2.1744", "Timed tickets only, and they sell out; book this first."],
        ["2027-05-25", "12:00", 75, "Casa Batlló", "Passeig de Gràcia 43, Barcelona", "41.3916, 2.1649", "Ticketed, with an audio guide."],
        ["2027-05-25", "14:00", 75, "Casa Milà (La Pedrera)", "Passeig de Gràcia 92, Barcelona", "41.3954, 2.1619", "A short walk up the same avenue; the roof terrace is the highlight."],
        ["2027-05-26", "09:30", 120, "Park Güell", "Carrer d'Olot, Barcelona", "41.4145, 2.1527", "Timed entry to the monumental area. Uphill — a taxi or bus saves the climb."],
        ["2027-05-26", "13:00", 90, "Barcelona Cathedral and the Gothic Quarter", "Pla de la Seu, Barcelona", "41.3840, 2.1762", "Narrow medieval lanes around the cathedral."],
        ["2027-05-26", "15:00", 60, "La Boqueria market", "La Rambla 91, Barcelona", "41.3817, 2.1716", "The covered market off La Rambla; quietest in the morning or mid-afternoon."],
        ["2027-05-26", "16:30", 90, "The Picasso Museum", "Carrer de Montcada 15, Barcelona", "41.3852, 2.1810", "In the El Born medieval palaces; book a time."],
        ["2027-05-27", "10:00", 120, "Montjuïc Castle and the cable car", "Carretera de Montjuïc 66, Barcelona", "41.3634, 2.1660", "The cable car up from the harbour side, and the view over the port."],
        ["2027-05-27", "13:30", 90, "Poble Espanyol or the National Art Museum of Catalonia", "Palau Nacional, Parc de Montjuïc, Barcelona", "41.3685, 2.1534", "Both on the hill; the museum steps give the best view over the city."],
        ["2027-05-27", "16:30", 90, "Ciutadella Park", "Passeig de Picasso 21, Barcelona", "41.3881, 2.1873", "Shade, the cascade fountain and a boating lake."],
        ["2027-05-28", "09:30", 90, "Passeig de Gràcia, and a last walk", "Passeig de Gràcia, Barcelona", "41.3917, 2.1650", "An easy morning before checking out."],
      ]),
    },
  },
];

export function sampleBySlug(slug: string): SampleItinerary | undefined {
  return SAMPLE_ITINERARIES.find((sample) => sample.slug === slug);
}

const DAY = 86_400_000;
const shiftDate = (iso: string | undefined, days: number) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
};

/**
 * The trip moved so it starts on `startDate`, every day, stay and stop with it.
 * Pure, so the copy can be tested without a browser.
 */
export function shiftItinerary(itinerary: Itinerary, startDate: string): Itinerary {
  if (!itinerary.startDate) return itinerary;
  const days = Math.round((Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${itinerary.startDate}T00:00:00Z`)) / DAY);
  if (!Number.isFinite(days)) return itinerary;
  return {
    ...itinerary,
    startDate: shiftDate(itinerary.startDate, days) ?? itinerary.startDate,
    endDate: shiftDate(itinerary.endDate, days) ?? itinerary.endDate,
    lodging: itinerary.lodging.map((stay) => ({ ...stay, checkIn: shiftDate(stay.checkIn, days) ?? stay.checkIn, checkOut: shiftDate(stay.checkOut, days) ?? stay.checkOut })),
    activities: itinerary.activities.map((stop) => ({ ...stop, date: shiftDate(stop.date, days) ?? stop.date })),
    flights: itinerary.flights.map((flight) => ({ ...flight, date: shiftDate(flight.date, days) ?? flight.date, arriveDate: shiftDate(flight.arriveDate, days) })),
  };
}
