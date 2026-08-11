import AiConnectionTest from "@/components/AiConnectionTest";
import EmailDeliveryTest from "@/components/EmailDeliveryTest";
import ContentExportPanel from "@/components/ContentExportPanel";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import DuffelKeyTest from "@/components/DuffelKeyTest";
import { describeFlights, describeHotels, flightsVia, hotelsVia } from "@/lib/booking-partners";
import { CONNECTIONS, readConnectionsProperly } from "@/lib/connections";
import MapKeyStatus from "@/components/MapKeyStatus";
import RoutingKeyTest from "@/components/RoutingKeyTest";
import SmsStatus from "@/components/SmsStatus";

export const dynamic = "force-dynamic";

export default function ConnectionSettings() {
  // Named one by one, because Next replaces `process.env.X` by name.
  const ENV: Record<string, string | undefined> = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    WHITE_GLOVE_SESSION_SECRET: process.env.WHITE_GLOVE_SESSION_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    OWNER_NOTIFICATION_EMAIL: process.env.OWNER_NOTIFICATION_EMAIL,
    CONTACT_NOTIFICATION_EMAIL: process.env.CONTACT_NOTIFICATION_EMAIL,
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
    DUFFEL_FLIGHTS: process.env.DUFFEL_FLIGHTS,
    DUFFEL_STAYS: process.env.DUFFEL_STAYS,
    AERODATABOX_API_KEY: process.env.AERODATABOX_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    KAYAK_AFFILIATE_PARAMS: process.env.KAYAK_AFFILIATE_PARAMS,
    BOOKING_AFFILIATE_ID: process.env.BOOKING_AFFILIATE_ID,
    TRAVELPAYOUTS_MARKER: process.env.TRAVELPAYOUTS_MARKER,
    SITE_ACCESS_PASSWORD: process.env.SITE_ACCESS_PASSWORD,
    SITE_PREVIEW_PASSWORD: process.env.SITE_PREVIEW_PASSWORD,
    SITE_LOCK_ENABLED: process.env.SITE_LOCK_ENABLED,
    TRIP_ARRANGEMENT: process.env.TRIP_ARRANGEMENT,
    DEFAULT_PHONE_COUNTRY: process.env.DEFAULT_PHONE_COUNTRY,
    DIRECTORY_FEATURED_NOTE: process.env.DIRECTORY_FEATURED_NOTE,
    GOOGLE_ROUTES_URL: process.env.GOOGLE_ROUTES_URL,
    OSRM_ROUTER_URL: process.env.OSRM_ROUTER_URL,
  };

  const flights = flightsVia({
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
    DUFFEL_FLIGHTS: process.env.DUFFEL_FLIGHTS,
  });
  const hotels = hotelsVia({
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
    DUFFEL_STAYS: process.env.DUFFEL_STAYS,
  });

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Connections</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The outside services the website leans on. Each one tells you whether it is working right now, and what to
          do if it is not. Nothing here is needed day to day.
        </p>
        <p className="mt-4 border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-700">
          These run on the server and report back a plain answer. Keys and passwords are never sent to your browser
          — with one deliberate exception, the map key, which is public by design and explained in its own panel.
        </p>
      </header>

      {/* Every variable read by name: Next substitutes these at build time, so
          a whole-object read is not the same thing. Only emptiness is ever
          looked at — no value reaches the browser. */}
      <ConnectionsPanel readings={readConnectionsProperly(Object.fromEntries(CONNECTIONS.flatMap((c) => c.vars).map((name) => [name, ENV[name]])))} />

      <div className="mt-8 space-y-5">
        <EmailDeliveryTest />
        <SmsStatus />
        <RoutingKeyTest />
        <MapKeyStatus />
        {/* Where the bookings actually go. Nobody could see this before, which
            is how flights moved onto Duffel without anybody deciding to. */}
        <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold-ink)]">Bookings</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Where searches go</h2>
          <dl className="mt-4 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold text-[var(--navy)]">Flights — {flights === "duffel" ? "this site" : "Kayak"}</dt>
              <dd className="text-stone-600">{describeFlights(flights)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--navy)]">Hotels — {hotels === "duffel" ? "this site" : "Booking.com"}</dt>
              <dd className="text-stone-600">{describeHotels(hotels)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Having a Duffel key does not move anything on its own. Both of these take an environment variable set to
            1, so a key added to try a search cannot quietly take the bookings with it.
          </p>
        </section>
        <DuffelKeyTest />
        <ContentExportPanel />
        <AiConnectionTest />
      </div>
    </>
  );
}
