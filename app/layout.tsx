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
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
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
