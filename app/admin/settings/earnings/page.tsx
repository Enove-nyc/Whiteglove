import Link from "next/link";
import EarningsForm from "@/components/EarningsForm";
import Stay22Form from "@/components/Stay22Form";
import TravelExtrasForm from "@/components/TravelExtrasForm";
import { readStay22Fresh } from "@/lib/stay22-store";
import { describeStay22, stay22IsOn } from "@/lib/stay22";
import { readExtrasFresh } from "@/lib/travel-extras-store";
import { describeLinks, SLOTS } from "@/lib/travelpayouts";
import { readTravelpayoutsLinksFresh, travelpayoutsStoreAvailable } from "@/lib/travelpayouts-store";

export const dynamic = "force-dynamic";

export default async function EarningsSettings() {
  // Uncached, unlike /book: this screen has to show what was saved a second
  // ago, not what the site is serving.
  const current = await readTravelpayoutsLinksFresh();
  const extras = await readExtrasFresh();
  const stay22 = await readStay22Fresh();

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
              What the searches earn
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              The three searches on the booking page hand travellers to somebody else to pay. Routed through
              Travelpayouts, a booking made afterwards is credited to you. Left alone, the search works exactly the
              same and earns nothing.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{describeLinks(current)}</p>
          </div>
          <Link
            href="/admin/settings"
            className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Settings
          </Link>
        </div>
      </header>

      <section className="mt-8 rounded-lg border border-[var(--gold-light)] bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Where to get each link</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-600">
          <li>Sign in to Travelpayouts and open the link builder for the programme you want.</li>
          <li>
            Paste in the partner&rsquo;s own address — {SLOTS.map((s) => s.host).filter((h, i, a) => a.indexOf(h) === i).join(" or ")} —
            and let it generate the link.
          </li>
          <li>Copy the whole thing it gives you back and paste it into the matching box below.</li>
        </ol>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          The link already carries your marker and your programme number, so there is nothing else to copy. Each box
          below checks that the link forwards to the partner that search actually opens, and refuses it if not — a link
          made for one partner does not track another, and there would be no way to tell from the outside.
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          If a programme you want is not on Travelpayouts, that search stays as it is. Nothing here changes what a
          traveller sees or where they end up.
        </p>
      </section>

      <section className="mt-12 rounded-lg border border-[var(--gold-light)] bg-white p-5">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Hotels, through Stay22</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Booking.com turned this site down for their own programme, and the Travelpayouts account came back with
          flights and car hire but no hotels — so of the three searches, the one most likely to be used was the one
          with no way to earn. Stay22 sits in front of Booking.com, Expedia, Hotels.com, Vrbo and Agoda under a single
          ID, and takes sites the big ones turn down.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Nothing to paste here but the ID. The place, the dates and the number of guests are already on the search
          form, so the hotel search is built for Stay22 properly rather than wrapped — which means what a traveller
          typed survives the hand-off.
        </p>
        <Stay22Form current={stay22} storeReady={travelpayoutsStoreAvailable()} />
      </section>

      <EarningsForm
        current={current}
        storeReady={travelpayoutsStoreAvailable()}
        hotelsElsewhere={
          stay22IsOn(stay22)
            ? `${describeStay22(stay22)} Nothing pasted in this box is used while that is set.`
            : undefined
        }
      />

      <section className="mt-14 border-t border-[var(--gold-light)] pt-10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Everything else worth offering</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          An eSIM, travel insurance, an airport transfer — anything a traveller buys that is not a flight, a room or a
          car. These are simpler than the searches above: there is no search to carry across, so the link you paste is
          the link that opens, and it earns from the moment you save it.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          They show under the search on{" "}
          <Link href="/book" target="_blank" className="underline decoration-[var(--gold)] underline-offset-2">
            the booking page
          </Link>
          , where somebody has just picked their dates.
        </p>
        <TravelExtrasForm current={extras} storeReady={travelpayoutsStoreAvailable()} />
      </section>
    </>
  );
}
