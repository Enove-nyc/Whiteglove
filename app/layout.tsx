import type { Metadata, Viewport } from "next";
import "./globals.css";
import IdleLogout from "@/components/IdleLogout";
import SiteTracker from "@/components/SiteTracker";

export const metadata: Metadata = {
  title: "White Glove Itineraries | Luxury Kosher Travel",
  description: "Thoughtfully planned kosher travel and Jewish heritage journeys.",
};

// Ensure mobile browsers use the device width (prevents a zoomed-out layout).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <SiteTracker />
        <IdleLogout minutes={45} endpoint="/api/account/logout" requireAccount />
        {children}
      </body>
    </html>
  );
}
