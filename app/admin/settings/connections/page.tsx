import AiConnectionTest from "@/components/AiConnectionTest";
import EmailDeliveryTest from "@/components/EmailDeliveryTest";
import DuffelKeyTest from "@/components/DuffelKeyTest";
import MapKeyStatus from "@/components/MapKeyStatus";
import RoutingKeyTest from "@/components/RoutingKeyTest";
import SmsStatus from "@/components/SmsStatus";

export const dynamic = "force-dynamic";

export default function ConnectionSettings() {
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
        <DuffelKeyTest />
        <AiConnectionTest />
      </div>
    </>
  );
}
