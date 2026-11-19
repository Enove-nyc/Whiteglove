import type { PageBlock } from "@/data/page-blocks";

export const ITINERARIES_ABOUT_BLOCKS: PageBlock[] = [
  { id: "about-why", kind: "text", heading: "Every trip, in one place", body: "Flights, hotels, transfers, activities and the notes that go with them belong together. White Glove Itineraries keeps them in one itinerary, from the first booking to the last day." },
  { id: "about-how", kind: "list", heading: "How it works", items: [
    "Book with our travel partners: flights, hotels, car rentals, things to do, transfers, eSIMs and travel insurance.",
    "Add each booking to your itinerary, day by day.",
    "See every day at a glance: what happens when, how long the drives take, and how much free time is left.",
    "Print it, save it as a PDF, or open it on your phone during the trip.",
  ] },
  { id: "about-paid", kind: "text", heading: "Free, with or without an account", body: "Anyone can build an itinerary here, and no account is needed. A trip built without one stays in your own browser on that device. If you already have a White Glove account, log in and your trips are kept with it on every device." },
  { id: "about-not", kind: "text", heading: "You plan, our partners book", body: "White Glove Itineraries is a tool for building your own itinerary. Bookings are made with our travel partners, who handle the payment and the booking itself." },
];
