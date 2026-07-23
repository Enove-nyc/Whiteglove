import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "White Glove Itineraries | Luxury Kosher Travel",
  description: "Thoughtfully planned kosher travel and Jewish heritage journeys.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
