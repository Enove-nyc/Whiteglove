import type { Metadata, Viewport } from "next";
import "./globals.css";
import NewSiteNotice from "@/components/NewSiteNotice";
import IdleLogout from "@/components/IdleLogout";
import RequiredFields from "@/components/RequiredFields";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SiteTracker from "@/components/SiteTracker";
import { getBetaNotice } from "@/lib/beta-notice-store";
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
    // Every icon here is built from public/logo-mark.png — the logo artwork
    // itself — by scripts/build-icons.mjs. Nothing is drawn by hand any more.
    //
    // Five earlier goes at this. /icon-192.png was named here first, the one
    // file with a solid navy square baked in: the blue box. Removing it fell
    // back to the full logo, transparent but shrunk naively, so its hairlines
    // dissolved into a gold smudge that read as a gold background. Both
    // complaints were accurate descriptions of what was on screen. The third
    // was the compass rose alone: legible, but the rose is the MAP's mark —
    // the pin on every marker, the key in its legend — and the site does not
    // name itself with it. The fourth and fifth were a redrawing of the logo,
    // first in the wrong colour and then in the right one. Legible, and still
    // not the mark.
    //
    // What makes the artwork itself work small is not redrawing it but two
    // steps that keep it: lifting the white out by solving for coverage rather
    // than keying it, so edges have a real alpha instead of a pale fringe; and
    // thickening the ink BEFORE shrinking, so a stroke has a pixel to land on.
    // scripts/build-icons.mjs says how, and why the tab icon is framed tighter
    // than the app icons.
    //
    // app/icon.png is the tab icon; the App Router links favicon.ico for us
    // and both come out of the same build.
    icon: [{ url: "/icon.png", type: "image/png", sizes: "96x96" }],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the notice, so the words come from the settings
  // on the server and the browser is only deciding whether this visitor has
  // already seen them.
  const betaNotice = await getBetaNotice();
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {/* First thing in the tab order, on every page. */}
        <a href="#main-content" className="wg-skip-link">Skip to content</a>
        {/* "This is new — check anything you are going to rely on." Once per
            visitor, never over the admin or a sign-in box, and above the page
            rather than across it: this used to be a modal in front of the
            front page, which is a box to dismiss before finding out what the
            site sells. */}
        <NewSiteNotice notice={betaNotice} />
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
