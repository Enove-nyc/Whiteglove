import Link from "next/link";
import EarningsForm from "@/components/EarningsForm";
import { describeLinks, SLOTS } from "@/lib/travelpayouts";
import { readTravelpayoutsLinksFresh, travelpayoutsStoreAvailable } from "@/lib/travelpayouts-store";

export const dynamic = "force-dynamic";

export default async function EarningsSettings() {
  // Uncached, unlike /book: this screen has to show what was saved a second
  // ago, not what the site is serving.
  const current = await readTravelpayoutsLinksFresh();

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
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

      <EarningsForm current={current} storeReady={travelpayoutsStoreAvailable()} />
    </>
  );
}
