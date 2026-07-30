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
      { source: "/booking/review", destination: "/book/review", permanent: true },
    ];
  },
};

export default nextConfig;
