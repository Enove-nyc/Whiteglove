import AdminNavLink from "@/components/AdminNavLink";

/**
 * The pieces both admin dashboards draw with — the Itineraries one at /admin
 * and the Kosher Travel one at /admin/kosher-travel (owner, 18 November 2026).
 */

export const cardClass =
  "rounded-xl border border-[var(--gold-light)] bg-[#FAF8F3] shadow-[0_1px_2px_rgba(23,45,82,.04)]";

export function QuickAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <AdminNavLink
      href={href}
      className={`${cardClass} group flex min-h-44 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_28px_rgba(23,45,82,.09)]`}
    >
      <span>
        <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-stone-600">{detail}</span>
      </span>
      <span className="mt-5 text-sm font-semibold text-[var(--navy)]">Open <span aria-hidden="true">→</span></span>
    </AdminNavLink>
  );
}

const totalCardClass =
  "rounded-xl border border-[var(--gold-light)] bg-[#FAF8F3] p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2";

export function TotalCard({
  label,
  value,
  href,
}: {
  label: string;
  value?: number;
  href: string | null;
}) {
  const body = (
    <>
      <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{label}</span>
      {value !== undefined && (
        <span className="mt-1 block font-[family-name:var(--font-display)] text-3xl tabular-nums text-[var(--navy)]">{value}</span>
      )}
    </>
  );

  if (!href) {
    return (
      <li className="min-w-0">
        <div className={`${totalCardClass} w-full min-w-0`} aria-disabled="true">
          {body}
        </div>
      </li>
    );
  }

  return (
    <li className="min-w-0">
      {/* flex-col opts out of .wg-admin a[class*="border"] { inline-flex }, which
          otherwise lays the label beside the count and spills into the next tile. */}
      <AdminNavLink
        href={href}
        className={`${totalCardClass} flex w-full min-w-0 flex-col hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_8px_22px_rgba(23,45,82,.08)]`}
        aria-label={`${label}: ${value}. Open ${label.toLowerCase()}.`}
      >
        {body}
      </AdminNavLink>
    </li>
  );
}
