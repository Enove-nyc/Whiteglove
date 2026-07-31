import Link from "next/link";
import AdminSignOut from "@/components/AdminSignOut";
import { getAdminContent, getPromotionsDashboard } from "@/lib/admin-content";
import { getEditableInventory } from "@/lib/admin-inventory";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { listPagesForAdmin } from "@/lib/pages";
import { getDashboardStats } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

const cardClass =
  "rounded-xl border border-[var(--gold-light)] bg-[#fffdf9] shadow-[0_1px_2px_rgba(23,45,82,.04)]";

function QuickAction({ href, title, detail, number }: { href: string; title: string; detail: string; number: string }) {
  return (
    <Link
      href={href}
      className={`${cardClass} group flex min-h-44 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_28px_rgba(23,45,82,.09)]`}
    >
      <span>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{number}</span>
        <span className="mt-4 block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-stone-600">{detail}</span>
      </span>
      <span className="mt-5 text-sm font-semibold text-[var(--navy)]">Open <span aria-hidden="true">→</span></span>
    </Link>
  );
}

function WorkPanel({
  title,
  count,
  children,
  href,
  hrefLabel,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  href: string;
  hrefLabel: string;
}) {
  return (
    <section className={`${cardClass} flex h-full flex-col p-5`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">{title}</h3>
        <span className={`min-w-8 rounded-full px-2.5 py-1 text-center text-xs font-bold ${count > 0 ? "bg-[var(--navy)] text-white" : "bg-stone-100 text-stone-500"}`}>
          {count}
        </span>
      </div>
      <div className="mt-3 flex-1 text-sm leading-6 text-stone-600">{children}</div>
      <Link href={href} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
        {hrefLabel} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="border-l-2 border-[var(--gold-light)] pl-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

export default async function AdminHome() {
  const [stats, inventory, promotions, content, pages] = await Promise.all([
    getDashboardStats(),
    getEditableInventory(),
    getPromotionsDashboard(),
    getAdminContent(),
    listPagesForAdmin(),
  ]);

  const pendingSuggestions = content.bundle.suggestions.filter((s) => s.status === "pending" || s.status === "needs-info");
  const unfinished = inventory.items.filter((item) => item.status !== "complete");
  const unpublishedPages = pages.filter((p) => p.status !== "PUBLISHED");
  const alerts: Array<{ text: string; href: string; label: string }> = [];

  if (stats.siteLocked) {
    alerts.push({
      text: "The website is closed to the public. Visitors currently see the access screen.",
      href: "/admin/settings/website",
      label: "Review website access",
    });
  }
  if (!stats.configured) {
    alerts.push({
      text: "The private store is not connected, so visitor numbers and some edits are not being saved.",
      href: "/admin/settings/connections",
      label: "Review connections",
    });
  }

  const attentionCount = alerts.length + unpublishedPages.length + pendingSuggestions.length + unfinished.length;

  return (
    <div className="pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--gold-light)] pb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Admin overview</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Your website at a glance
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            See what needs attention, handle common jobs, and reach every management area from one organized screen.
          </p>
        </div>
        <AdminSignOut />
      </header>

      {alerts.length > 0 && (
        <section aria-labelledby="attention-heading" className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id="attention-heading" className="font-[family-name:var(--font-display)] text-2xl text-amber-950">Needs attention</h2>
            <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">{alerts.length}</span>
          </div>
          <ul className="mt-4 divide-y divide-amber-200">
            {alerts.map((alert) => (
              <li key={alert.href} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-amber-950">{alert.text}</p>
                <Link href={alert.href} className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-amber-950 underline underline-offset-4">
                  {alert.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="snapshot-heading" className={`${cardClass} mt-7 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Today</p>
            <h2 id="snapshot-heading" className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Website snapshot</h2>
          </div>
          <p className="text-xs text-stone-500">{stats.configured ? "Live website activity" : "Activity tracking is not connected"}</p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Visits" value={stats.configured ? stats.visitsToday : "—"} detail="People who visited today" />
          <Metric label="Searches" value={stats.configured ? stats.searchesToday : "—"} detail="Searches made today" />
          <Metric label="Advertisements" value={promotions.enabledPromotions} detail="Currently running" />
          <Metric label="Needs attention" value={attentionCount} detail="Across drafts, suggestions and checklist" />
        </div>
        {stats.configured && stats.topSearches.length > 0 && (
          <p className="mt-6 border-t border-[var(--gold-light)] pt-4 text-sm leading-6 text-stone-600">
            Most searched: <strong className="font-semibold text-[var(--navy)]">{stats.topSearches.slice(0, 3).map((s) => s.label).join(", ")}</strong>
          </p>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading" className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Common jobs</p>
            <h2 id="quick-actions-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Quick actions</h2>
          </div>
          <p className="text-sm text-stone-500">The tasks you are most likely to need</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <QuickAction number="01" href="/admin/pages" title="Edit a page" detail="Change the words or pictures on any website page." />
          <QuickAction number="02" href="/admin/directory" title="Manage the directory" detail="Add or update a town, beis hachaim, contact, or business." />
          <QuickAction number="03" href="/admin/advertisements" title="Manage advertisements" detail="Create or update banners, popups, and promotions." />
        </div>
      </section>

      <section aria-labelledby="work-heading" className="mt-9">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Your queue</p>
          <h2 id="work-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Work waiting for you</h2>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <WorkPanel title="Waiting to be published" count={unpublishedPages.length} href="/admin/pages" hrefLabel="Open pages">
            {unpublishedPages.length === 0 ? (
              <p>Every page is published. Nothing is sitting as a draft.</p>
            ) : (
              <ul className="space-y-2">
                {unpublishedPages.slice(0, 4).map((page) => (
                  <li key={page.slug} className="flex justify-between gap-3">
                    <span className="font-semibold text-[var(--navy)]">{page.title}</span>
                    <span className="text-stone-500">{page.status === "DRAFT" ? "Draft" : "Review"}</span>
                  </li>
                ))}
              </ul>
            )}
          </WorkPanel>

          <WorkPanel title="Visitor suggestions" count={pendingSuggestions.length} href="/admin/content" hrefLabel="Read suggestions">
            {pendingSuggestions.length === 0 ? (
              <p>No visitor corrections are waiting.</p>
            ) : (
              <ul className="space-y-2">
                {pendingSuggestions.slice(0, 4).map((suggestion) => (
                  <li key={suggestion.id}>
                    <span className="font-semibold text-[var(--navy)]">{suggestion.title || suggestion.targetId}</span>
                    <span className="block truncate text-stone-500">{suggestion.issue || suggestion.suggestedInfo || "No note"}</span>
                  </li>
                ))}
              </ul>
            )}
          </WorkPanel>

          <WorkPanel title="Unfinished checklist" count={unfinished.length} href="/admin/inventory" hrefLabel="Open checklist">
            {unfinished.length === 0 ? (
              <p>Nothing on the checklist is outstanding.</p>
            ) : (
              <p>{unfinished.length} {unfinished.length === 1 ? "item is" : "items are"} marked unfinished, including pages to write and details to confirm.</p>
            )}
          </WorkPanel>
        </div>
      </section>

      <section aria-labelledby="all-tools-heading" className="mt-10 border-t border-[var(--gold-light)] pt-9">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Full dashboard</p>
          <h2 id="all-tools-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Everything you can manage</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Every existing admin area, organized by purpose. Nothing has been added or removed.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.filter((section) => section.href !== "/admin").map((section) => (
            <section key={section.href} className={`${cardClass} p-5`}>
              <Link href={section.href} className="group flex items-start gap-3">
                <span aria-hidden="true" className="mt-0.5 text-lg text-[var(--gold)]">{section.icon}</span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-2xl text-[var(--navy)] group-hover:underline group-hover:decoration-[var(--gold)] group-hover:underline-offset-4">{section.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-stone-600">{section.blurb}</span>
                </span>
              </Link>
              {section.children && section.children.length > 0 && (
                <ul className="mt-4 border-t border-[var(--gold-light)] pt-3">
                  {section.children.map((child) => (
                    <li key={child.href + child.label}>
                      <Link href={child.href} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-stone-700 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">
                        <span>{child.label}</span>
                        <span aria-hidden="true" className="text-[var(--gold)]">→</span>
                      </Link>
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
