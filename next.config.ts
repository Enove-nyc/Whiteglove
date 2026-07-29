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
    ];
  },
};

export default nextConfig;
