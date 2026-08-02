import AiConnectionTest from "@/components/AiConnectionTest";
import EmailDeliveryTest from "@/components/EmailDeliveryTest";
import ContentExportPanel from "@/components/ContentExportPanel";
import DuffelKeyTest from "@/components/DuffelKeyTest";
import { describeFlights, describeHotels, flightsVia, hotelsVia } from "@/lib/booking-partners";
import MapKeyStatus from "@/components/MapKeyStatus";
import RoutingKeyTest from "@/components/RoutingKeyTest";
import SmsStatus from "@/components/SmsStatus";

export const dynamic = "force-dynamic";

export default function ConnectionSettings() {
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

      <div className="mt-8 space-y-5">
        <EmailDeliveryTest />
        <SmsStatus />
        <RoutingKeyTest />
        <MapKeyStatus />
        {/* Where the bookings actually go. Nobody could see this before, which
            is how flights moved onto Duffel without anybody deciding to. */}
        <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Bookings</p>
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
