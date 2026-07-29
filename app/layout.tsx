import type { Metadata, Viewport } from "next";
import "./globals.css";
import IdleLogout from "@/components/IdleLogout";
import RequiredFields from "@/components/RequiredFields";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SiteTracker from "@/components/SiteTracker";

export const metadata: Metadata = {
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
        <SiteTracker />
        <RequiredFields />
        <ServiceWorkerRegister />
        <IdleLogout minutes={45} endpoint="/api/account/logout" requireAccount />
        {children}
      </body>
    </html>
  );
}
