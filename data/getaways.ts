// Kosher getaways — vacations, resorts, and city trips, separate from the
// kevarim/nesios guides. Starter set; edit or expand as the offering grows.

export type Getaway = {
  slug: string;
  name: string;
  country: string;
  type: "City getaway" | "Resort & beach" | "Mountain retreat";
  summary: string;
};

export const getaways: Getaway[] = [
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    type: "City getaway",
    summary: "The Jewish quarter, kosher dining, and timeless sights — Rome with every detail arranged.",
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    type: "City getaway",
    summary: "The Marais, kosher restaurants, and the classics — a kosher Paris trip, planned end to end.",
  },
  {
    slug: "swiss-alps",
    name: "Swiss Alps",
    country: "Switzerland",
    type: "Mountain retreat",
    summary: "Mountain air and kosher comfort — a restful alpine getaway for the whole family.",
  },
  {
    slug: "costa-del-sol",
    name: "Costa del Sol",
    country: "Spain",
    type: "Resort & beach",
    summary: "Sun, sea, and a relaxed kosher stay along Spain's southern coast.",
  },
  {
    slug: "greek-isles",
    name: "Greek Isles",
    country: "Greece",
    type: "Resort & beach",
    summary: "Island calm with kosher arrangements handled, from arrival to the last sunset.",
  },
  {
    slug: "london",
    name: "London",
    country: "United Kingdom",
    type: "City getaway",
    summary: "A kosher-easy city break — established kosher dining, community, and the sights.",
  },
];

export function getGetaway(slug: string) {
  return getaways.find((g) => g.slug === slug);
}
