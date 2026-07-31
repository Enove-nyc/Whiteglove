import type { Metadata, Viewport } from "next";
import "./globals.css";
import IdleLogout from "@/components/IdleLogout";
import RequiredFields from "@/components/RequiredFields";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SiteTracker from "@/components/SiteTracker";
import { siteOrigin } from "@/lib/seo";

export const metadata: Metadata = {
  // Set once, here, so every page below can give its canonical URL and its
  // share image as a plain path and have them resolved to this deployment's
  // real address. See lib/seo.ts.
  metadataBase: siteOrigin(),
  title: "White Glove Itineraries | Luxury Kosher Travel",
  description: "Thoughtfully planned kosher travel and Jewish heritage journeys.",
  applicationName: "White Glove Itineraries",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "White Glove" },
  icons: {
    // The SVG named explicitly, because the App Router links favicon.ico and
    // stops — it will not offer both on its own. A browser that understands SVG
    // takes this one and stays sharp at any size; anything older falls back to
    // the .ico, which Next links for us and which scripts/build-favicon.mjs
    // draws from the very same compass rose.
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    // Two earlier goes at this, both wrong in different ways. First /icon-192.png
    // was named here, which is the one file with a solid navy square baked in —
    // the blue box. Removing it fell back to the full logo, transparent but
    // drawn in hairlines that cannot resolve at sixteen pixels, so it dissolved
    // into a gold smudge that read as a gold background. Both complaints were
    // accurate descriptions of what was on screen.
    //
    // A favicon gets one shape, drawn thick. It is the compass rose from the
    // logo now — the same mark as the map pins.
    //
    // The navy background is right where it is used. An installed app icon
    // (app/manifest.ts) is drawn on the home screen with no page behind it, and
    // a transparent one there looks broken rather than elegant.
    //
    // The Apple touch icon MUST stay opaque: iOS does not honour transparency
    // in it, it composites the image onto black. A transparent logo would
    // become a navy logo on a black square, which is worse than what we have.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// Ensure mobile browsers use the device width (prevents a zoomed-out layout).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14213d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {/* First thing in the tab order, on every page. */}
        <a href="#main-content" className="wg-skip-link">Skip to content</a>
        <SiteTracker />
        <RequiredFields />
        <ServiceWorkerRegister />
        <IdleLogout minutes={45} endpoint="/api/account/logout" requireAccount />
        {/* tabIndex -1 so the skip link can actually put the focus here.
            Without it the browser scrolls to the anchor and leaves the focus
            behind, and the next Tab starts at the header again. */}
        <div id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
