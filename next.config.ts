import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Planning and Services were two pages saying overlapping things: one
      // listed the services, the other described the main one. They are a
      // single Services page now. The old address keeps working —
      // permanently, so a search engine carries its ranking across rather than
      // treating the new page as a stranger — because links to it exist in
      // the wild and in people's bookmarks.
      { source: "/planning", destination: "/services", permanent: true },
      // The same story, for the same reason. /book and /booking were two
      // travel-booking pages: different headings ("Book with cash, or with
      // miles" and "Flights & hotels"), different search components, two
      // versions of the same flow to keep working. The polished navigation
      // pointed at one, the destination pages at the other. /book is the
      // canonical one now — it can do everything /booking could — and the old
      // addresses redirect permanently so links in the wild carry across
      // rather than looking like a second, competing page.
      { source: "/booking", destination: "/book", permanent: true },
      // /book/review was the Duffel checkout. Duffel takes a card and issues a
      // ticket, which is a different business from sending somebody to a
      // partner, so it moved to /admin/duffel and off the public site
      // entirely. The two old public addresses land on the booking page rather
      // than on a 404: somebody following a stale link wanted to book travel,
      // and that is still here.
      { source: "/booking/review", destination: "/book", permanent: true },
      { source: "/book/review", destination: "/book", permanent: true },
      // "Getaways" was one editable hero block and nothing under it, on a
      // page whose name told a vacation customer very little. It became
      // /vacation-ideas and is /destinations now — a real hub over the
      // destinations the site holds data for — and both old addresses carry
      // their links and their ranking across rather than competing with it.
      //
      // The CMS still knows the page by the slug "getaways", deliberately:
      // renaming the key would have thrown away whatever the owner has
      // already written there, for a cosmetic tidy. See app/destinations.
      { source: "/getaways", destination: "/destinations", permanent: true },
      // The vacation hub took the word "Destinations" in the navigation, so it
      // took the address to match. A visitor pressing an item called
      // Destinations and landing on /vacation-ideas is a small lie about what
      // the site is, and the two names would have to be explained for ever.
      //
      // These two are safe as wildcards because nothing else lives under
      // /vacation-ideas. The heritage half of the same rename is NOT a
      // wildcard and cannot be — see lib/route-migration.ts and middleware.ts.
      { source: "/vacation-ideas", destination: "/destinations", permanent: true },
      { source: "/vacation-ideas/:slug", destination: "/destinations/:slug", permanent: true },
      // Two pages renamed to what the navigation calls them. "Kosher stays"
      // described the record; "Hotels & Stays" is what somebody is looking
      // for, and the page is about to become a search rather than a list.
      // "Attractions" is a word from a guidebook.
      { source: "/kosher-stays", destination: "/hotels", permanent: true },
      { source: "/attractions", destination: "/things-to-do", permanent: true },
    ];
  },
};

export default nextConfig;
