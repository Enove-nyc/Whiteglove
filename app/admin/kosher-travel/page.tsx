import AdminNavLink from "@/components/AdminNavLink";
import { TotalCard, cardClass } from "@/components/admin/DashboardParts";
import { PageHeader } from "@/components/ui/PageHeader";
import { currentAdmin } from "@/lib/admin-current";
import { getEditableInventory } from "@/lib/admin-inventory";
import { ADMIN_QUICK_ADD, ADMIN_SECTIONS } from "@/lib/admin-nav";
import { ADMIN_TOTAL_CARDS, contentTotals } from "@/lib/admin-overview";
import { canOpen } from "@/lib/admin-permissions";
import { KOSHER_SITE_PREFIX } from "@/lib/kosher-site-archive";
import { listPagesForAdmin } from "@/lib/pages";

export const dynamic = "force-dynamic";

/**
 * THE KOSHER TRAVEL DASHBOARD (owner, 18 November 2026).
 *
 * White Glove Kosher Travel has closed and its listings are kept for the owner
 * alone. This is their home inside the admin: the directory, its pages, the
 * listing review and the whole old site, kept apart from the Itineraries
 * dashboard at /admin, which runs the live site.
 *
 * NOTHING HEAVY IS READ HERE. The listing-review queue unpacks tens of
 * thousands of candidates, which is more than one Cloudflare request can
 * carry, so it is a link to its own screen rather than a count on this one.
 * Each read that is here stands on its own, so one failing leaves its tile out
 * instead of taking the page down.
 */
export default async function KosherTravelDashboard() {
  const { areas } = await currentAdmin();
  const may = (href: string) => canOpen(areas, href);
  const safe = <T,>(label: string, read: Promise<T>, fallback: T): Promise<T> =>
    read.catch((error) => {
      console.error(`[kosher dashboard] ${label} could not be read`, error);
      return fallback;
    });

  const [inventory, pages] = await Promise.all([
    safe("checklist", getEditableInventory(), { configured: false, items: [] }),
    safe("pages", listPagesForAdmin(), []),
  ]);
  // Counted from the built-in content, so the tiles stand without the database.
  const totals = contentTotals();

  const waiting = [
    { label: "Pages not published", count: pages.filter((p) => p.status !== "PUBLISHED").length, href: "/admin/pages" },
    { label: "Checklist items unfinished", count: inventory.items.filter((item) => item.status !== "complete").length, href: "/admin/inventory" },
  ].filter((item) => item.count > 0 && may(item.href));
  const quickAdd = ADMIN_QUICK_ADD.filter((item) => may(item.href) && item.href !== "/admin/advertisements");
  const sections = ADMIN_SECTIONS.filter((section) => section.side === "kosher" && section.href !== "/admin/kosher-travel")
    .map((section) => ({ ...section, children: (section.children ?? []).filter((child) => may(child.href)) }))
    .filter((section) => may(section.href) || section.children.length > 0);

  return (
    <div className="pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--gold-light)] pb-7">
        <PageHeader eyebrow="White Glove Kosher Travel" title="Kosher Travel dashboard" />
        {/* A plain link, not next/link, so the middleware serves it as Kosher Travel. */}
        <a
          href={KOSHER_SITE_PREFIX}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          Open the Kosher Travel site
        </a>
      </header>

      <p className="mt-6 max-w-3xl text-sm leading-6 text-stone-600">
        The closed site&rsquo;s listings, pages and research, kept for you alone. Nothing here is public.
      </p>

      <section aria-labelledby="kt-waiting" className="mt-7">
        <h2 id="kt-waiting" className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Waiting on you</h2>
        {waiting.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">Nothing is waiting for you here.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {waiting.map((item) => (
              <TotalCard key={item.label} label={item.label} value={item.count} href={item.href} />
            ))}
          </ul>
        )}
        {may("/admin/imports/needs-review") && (
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Listing candidates are on{" "}
            <AdminNavLink href="/admin/imports/needs-review" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
              Needs review
            </AdminNavLink>
            .
          </p>
        )}
      </section>

      {quickAdd.length > 0 && (
        <section aria-labelledby="kt-add" className="mt-7">
          <h2 id="kt-add" className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Add something</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickAdd.map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white"
              >
                + {item.label}
              </AdminNavLink>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="kt-totals" className="mt-10 border-t border-[var(--gold-light)] pt-7">
        <h2 id="kt-totals" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">What the archive holds</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ADMIN_TOTAL_CARDS.map((card) => (
            <TotalCard key={card.key} label={card.label} value={totals[card.key]} href={may(card.href) ? card.href : null} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="kt-all" className="mt-10 border-t border-[var(--gold-light)] pt-9">
        <h2 id="kt-all" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Everything in the archive</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <section key={section.href} className={`${cardClass} p-5`}>
              <AdminNavLink href={may(section.href) ? section.href : section.children[0].href} className="group flex items-start gap-3">
                <span aria-hidden="true" className="mt-0.5 text-lg text-[var(--gold-ink)]">{section.icon}</span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-2xl text-[var(--navy)] group-hover:underline group-hover:decoration-[var(--gold)] group-hover:underline-offset-4">{section.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-stone-600">{section.blurb}</span>
                </span>
              </AdminNavLink>
              {section.children.length > 0 && (
                <ul className="mt-4 border-t border-[var(--gold-light)] pt-3">
                  {section.children.map((child) => (
                    <li key={child.href + child.label}>
                      <AdminNavLink href={child.href} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-stone-700 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">
                        <span>{child.label}</span>
                        <span aria-hidden="true" className="text-[var(--gold-ink)]">→</span>
                      </AdminNavLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
