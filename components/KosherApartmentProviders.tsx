import { listAllApartmentProviders } from "@/lib/kosher-apartments";

/**
 * Where to find a kosher short-term apartment — a section on Where to stay.
 *
 * These are the sites, agencies and hosts a traveller goes to in order to find
 * a kosher-equipped apartment or vacation flat, not apartments the site books
 * itself. Every action opens the provider in a new tab or dials them; nothing
 * here is a reservation.
 *
 * RENDERS NOTHING WHEN THERE ARE NONE. The list ships empty and the owner fills
 * it from the admin, so until it has entries this section is absent rather than
 * an empty frame — the site's rule for anything not yet ready for a customer.
 */

const telHref = (value: string) => `tel:${value.replace(/[^+\d]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/[^\d]/g, "")}`;

const linkClass =
  "inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white";

export default async function KosherApartmentProviders() {
  const providers = await listAllApartmentProviders();
  if (providers.length === 0) return null;

  return (
    <section aria-labelledby="kosher-apartments" className="mt-12 border-t border-[var(--gold-light)] pt-10">
      <h2 id="kosher-apartments" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
        Kosher apartments and short-term rentals
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-stone-600">
        Sites, agencies and hosts that rent kosher-equipped apartments and vacation flats. Each opens with the provider,
        who arranges the stay and its terms directly.
      </p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <li key={provider.id} className="flex flex-col border border-[var(--gold-light)] bg-[var(--surface)] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{provider.area}</p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
              {provider.name}
            </h3>
            {provider.note && <p className="mt-2 text-sm leading-6 text-stone-600">{provider.note}</p>}

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {provider.url && (
                <a href={provider.url} target="_blank" rel="noreferrer" className={linkClass}>
                  Website ↗
                </a>
              )}
              {provider.phone && (
                <a href={telHref(provider.phone)} className={linkClass}>
                  Call
                </a>
              )}
              {provider.whatsapp && (
                <a href={waHref(provider.whatsapp)} target="_blank" rel="noreferrer" className={linkClass}>
                  WhatsApp
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
