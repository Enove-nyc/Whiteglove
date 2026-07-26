// Editable general/marketing pages. Each entry is the built-in default for a
// page's heading + intro text. On "Set up database" these become editable Page
// rows; the admin portal (/admin/pages) edits them and the change shows on the
// public page within a minute — no code, no redeploy.
//
// `slug` matches the route (without the leading slash). `eyebrow` is the small
// uppercase kicker and stays in code; `title` (heading) and `body` (intro/lead
// paragraph) are what the owner edits. Body supports simple formatting: blank
// lines separate paragraphs, lines starting with "## " become subheadings, and
// lines starting with "- " become bullet points.

export type PageDef = {
  slug: string;
  label: string; // human name in the admin list
  eyebrow: string; // static kicker shown above the heading
  title: string; // editable heading
  body: string; // editable intro / lead paragraph(s)
};

export const editablePages: PageDef[] = [
  {
    slug: "services",
    label: "Services",
    eyebrow: "White Glove services",
    title: "Services",
    body: "This hub gathers the service pages that sit alongside the destination directory and itinerary tools.",
  },
  {
    slug: "planning",
    label: "Planning",
    eyebrow: "White Glove concierge",
    title: "Your Route Traveler",
    body: "This page is the start of the personalized planning service. Travelers can describe what they need, and White Glove can shape the route, hotels, flights, and practical details around that trip.",
  },
  {
    slug: "honeymoon",
    label: "Honeymoon",
    eyebrow: "White Glove special service",
    title: "Honeymoon",
    body: "We are building this page as a premium honeymoon planning service for kosher travelers. It is being developed carefully so the final version feels calm, private, and practical.",
  },
  {
    slug: "getaways",
    label: "Getaways",
    eyebrow: "Kosher getaways",
    title: "Vacations and getaways, planned kosher.",
    body: "Beyond kevarim and nesios, White Glove plans the trips you take to unwind — resorts, beaches, mountains, and cities like Rome and Paris — with kosher food, Shabbos, and every detail arranged.",
  },
  {
    slug: "phone-rentals",
    label: "Phone Rentals",
    eyebrow: "Future service",
    title: "Phone Rentals",
    body: "This page covers the future SIM, eSIM, hotspot, and phone rental offering so travelers can stay reachable without juggling setup details.",
  },
  {
    slug: "travel-insurance",
    label: "Travel Insurance",
    eyebrow: "Future service",
    title: "Travel Insurance",
    body: "This page introduces the future travel insurance referral or guidance page. It is designed to explain the coverage types without pretending to be the insurer.",
  },
  {
    slug: "flight-booking-assistance",
    label: "Flight Booking Assistance",
    eyebrow: "Future service",
    title: "Flight Booking Assistance",
    body: "This page is for travelers who want a person to help gather the flight details and request a booking on their behalf.",
  },
];

export function getPageDef(slug: string): PageDef | undefined {
  return editablePages.find((page) => page.slug === slug);
}
