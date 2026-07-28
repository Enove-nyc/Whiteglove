import Link from "next/link";
import AdminSignOut from "@/components/AdminSignOut";
import { getAdminContent, getPromotionsDashboard } from "@/lib/admin-content";
import { getEditableInventory } from "@/lib/admin-inventory";
import { listPagesForAdmin } from "@/lib/pages";
import { getDashboardStats } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

// Home is "what needs you today", not a control panel.
//
// Three things you might have come here to do, then anything actually waiting
// on you, then a short honest sentence about how the site is doing. Passwords,
// keys and connection tests live in Settings — none of that belongs on the
// first screen you see.

const actionClass =
  "group flex flex-col justify-between border border-[var(--gold-light)] bg-[#fcfaf6] p-6 transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]";

function BigAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link href={href} className={actionClass}>
      <span>
        <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-stone-600">{detail}</span>
      </span>
      <span className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] transition group-hover:text-[var(--navy)]">
        Start →
      </span>
    </Link>
  );
}

function Panel({
  title,
  count,
  children,
  href,
  hrefLabel,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{title}</h2>
        {typeof count === "number" && count > 0 && (
          <span className="rounded-full bg-[var(--navy)] px-2.5 py-0.5 text-xs font-bold text-white">{count}</span>
        )}
      </div>
      <div className="mt-3 text-sm leading-6 text-stone-600">{children}</div>
      {href && (
        <Link
          href={href}
          className="mt-4 inline-block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
        >
          {hrefLabel ?? "Open"} →
        </Link>
      )}
    </section>
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

  // Only things the owner can actually act on. "The database is not connected"
  // is worth saying because it stops edits from saving; a missing API key is a
  // Settings matter and stays there.
  const alerts: Array<{ text: string; href: string; label: string }> = [];
  if (stats.siteLocked) {
    alerts.push({
      text: "The website is closed to the public right now. Visitors see the access screen instead of the site.",
      href: "/admin/settings/website",
      label: "Open the website",
    });
  }
  if (!stats.configured) {
    alerts.push({
      text: "The private store is not connected, so visitor numbers and some of your edits are not being saved.",
      href: "/admin/settings/connections",
      label: "See what is missing",
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">
            Good to see you
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Everything about the website is in the five places down the left. Start with one of these.
          </p>
        </div>
        <AdminSignOut />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <BigAction href="/admin/pages" title="Edit a page" detail="Change the words or pictures on any page of the website." />
        <BigAction href="/admin/directory" title="Add a directory entry" detail="A town, a beis hachaim, a contact or a business." />
        <BigAction href="/admin/advertisements" title="Create an advertisement" detail="A banner, a popup, or a promotion on the itineraries." />
      </div>

      {alerts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Needs your attention</h2>
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => (
              <li key={a.href} className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                <p className="text-sm leading-6 text-amber-900">{a.text}</p>
                <Link
                  href={a.href}
                  className="mt-2 inline-block text-xs font-bold uppercase tracking-[0.12em] text-amber-900 underline underline-offset-4"
                >
                  {a.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Panel title="Waiting to be published" count={unpublishedPages.length} href="/admin/pages" hrefLabel="Open pages">
          {unpublishedPages.length === 0 ? (
            <p>Every page is published. Nothing is sitting as a draft.</p>
          ) : (
            <ul className="space-y-1">
              {unpublishedPages.slice(0, 5).map((p) => (
                <li key={p.slug}>
                  <span className="font-semibold text-[var(--navy)]">{p.title}</span>{" "}
                  <span className="text-stone-500">— {p.status === "DRAFT" ? "draft" : "needs review"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Suggestions from visitors" count={pendingSuggestions.length} href="/admin/content" hrefLabel="Read them">
          {pendingSuggestions.length === 0 ? (
            <p>Nobody has sent in a correction that is still waiting.</p>
          ) : (
            <ul className="space-y-1">
              {pendingSuggestions.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <span className="font-semibold text-[var(--navy)]">{s.title || s.targetId}</span>{" "}
                  <span className="text-stone-500">— {(s.issue || s.suggestedInfo || "no note").slice(0, 60)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Still unfinished" count={unfinished.length} href="/admin/inventory" hrefLabel="See the checklist">
          {unfinished.length === 0 ? (
            <p>Nothing on the checklist is outstanding.</p>
          ) : (
            <p>
              {unfinished.length} {unfinished.length === 1 ? "item is" : "items are"} marked not finished — pages to
              write, details to confirm.
            </p>
          )}
        </Panel>
      </div>

      <section className="mt-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">How the site is doing</h2>
        {stats.configured ? (
          <>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              <strong className="text-[var(--navy)]">{stats.visitsToday}</strong>{" "}
              {stats.visitsToday === 1 ? "visit" : "visits"} today, and{" "}
              <strong className="text-[var(--navy)]">{stats.searchesToday}</strong>{" "}
              {stats.searchesToday === 1 ? "search" : "searches"}.{" "}
              {promotions.enabledPromotions > 0
                ? `${promotions.enabledPromotions} ${promotions.enabledPromotions === 1 ? "advertisement is" : "advertisements are"} running.`
                : "No advertisements are running."}
            </p>
            {stats.topSearches.length > 0 && (
              <p className="mt-3 text-sm leading-7 text-stone-600">
                People are searching most for{" "}
                <strong className="text-[var(--navy)]">
                  {stats.topSearches.slice(0, 3).map((s) => s.label).join(", ")}
                </strong>
                . Worth checking those pages are as good as they can be.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Visitor numbers are not being recorded yet. There is nothing wrong with the website — it simply has
            nowhere private to write them down.
          </p>
        )}
      </section>
    </>
  );
}
