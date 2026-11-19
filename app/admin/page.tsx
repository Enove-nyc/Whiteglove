import AdminNavLink from "@/components/AdminNavLink";
import { QuickAction, TotalCard, cardClass } from "@/components/admin/DashboardParts";
import AdminSignOut from "@/components/AdminSignOut";
import { getAdminContent } from "@/lib/admin-content";
import { currentAdmin } from "@/lib/admin-current";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { canOpen, describeAreas } from "@/lib/admin-permissions";
import { adsNeedingAttention } from "@/lib/ad-performance";
import { describeAdmin } from "@/lib/admin-session";
import { messagesAlert } from "@/lib/contact-messages";
import { listContactMessages } from "@/lib/contact-store";
import { listPlanRequests } from "@/lib/account-plan-store";
import { getDashboardStats } from "@/lib/site-analytics";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { identity: signedInAs, areas } = await currentAdmin();
  // The dashboard is open to every administrator, so it is the one screen that
  // has to draw itself around what this person may open. A tile that refuses
  // them is worse than no tile: it reads as something broken.
  const may = (href: string) => canOpen(areas, href);

  // THE ITINERARIES DASHBOARD (owner, 18 November 2026). The Kosher Travel
  // archive — the directory, its pages, the listing review — has its own
  // dashboard at /admin/kosher-travel, so none of it is loaded here.
  //
  // EACH READ STANDS ON ITS OWN. One failing used to take the whole page down
  // to "Something went wrong" — on Cloudflare the listing review alone was
  // enough. A read that fails now leaves its tile out and says so in the log.
  const safe = <T,>(label: string, read: Promise<T>, fallback: T): Promise<T> =>
    read.catch((error) => {
      console.error(`[admin home] ${label} could not be read`, error);
      return fallback;
    });
  const [stats, content, messages] = await Promise.all([
    safe("site stats", getDashboardStats(), null),
    safe("promotions", getAdminContent(), null),
    safe("messages", listContactMessages(), []),
  ]);

  const alerts: Array<{ text: string; href: string; label: string }> = [];

  if (stats?.siteLocked) {
    alerts.push({
      text: "The website is closed to the public. Visitors currently see the access screen.",
      href: "/admin/settings/website",
      label: "Review website access",
    });
  }
  if (stats && !stats.configured) {
    alerts.push({
      text: "The private store is not connected, so visitor numbers and some edits are not being saved.",
      href: "/admin/settings/connections",
      label: "Review connections",
    });
  }
  // An advertisement that finished in March still reads as enabled in every
  // list. The owner would only find it by comparing eleven dates to today.
  const adTrouble = content ? adsNeedingAttention(content.bundle.promotions, new Date().toISOString().slice(0, 10)) : null;
  if (adTrouble) {
    alerts.push({ text: adTrouble.says, href: "/admin/advertisements", label: "Open advertisements" });
  }

  // Somebody wrote in from the contact page, the trip enquiry or the flight
  // request. Until now the only record of any of them was an email — so if the
  // mail service was away, or the address had quietly stopped working, nothing
  // anywhere said that a person had asked this website for something and heard
  // nothing back.
  const messageNews = messagesAlert(messages, new Date().toISOString());
  if (messageNews) {
    alerts.push({ text: messageNews, href: "/admin/messages", label: "Read them" });
  }

  // Somebody asked about Gold or Business and is waiting on a person. This used
  // to arrive in complete silence: written to the store, shown on
  // /admin/accounts, and announced nowhere — while the person who asked was
  // told "we have it, and we will be in touch".
  const plansWaiting = (await safe("plan requests", listPlanRequests(), [])).filter((r) => r.state === "asked").length;
  // ONE PERSON IS ONE PERSON. "Account requests are waiting" read like a queue
  // whatever the number, and a queue is easier to leave until later than
  // somebody waiting. The number is said now, and said grammatically.
  //
  // And what answering costs, said here rather than found out by clicking:
  // while plans are asked for rather than bought, saying yes or no charges
  // nobody and starts no subscription — see lib/plan-billing.ts. That sentence
  // is what turns "I'll look at this properly later" into a decision somebody
  // can make now.
  if (plansWaiting > 0) {
    alerts.push({
      text:
        plansWaiting === 1
          ? "One person has asked about a plan. Nothing is charged either way."
          : `${plansWaiting} people have asked about a plan. Nothing is charged either way.`,
      href: "/admin/accounts",
      label: "Answer them",
    });
  }

  const visibleAlerts = alerts.filter((alert) => may(alert.href));

  /**
   * WHAT IS ACTUALLY WAITING, AS ONE LIST — and nothing at all when nothing is.
   *
   * The owner's own queue was in two sections with two launcher sections
   * between them: "Waiting on you", six count cards, and "Work waiting for
   * you", four panels, further down past "Add something" and "Quick actions".
   * Same question, asked twice, split by furniture.
   *
   * AND ON A QUIET DAY IT FILLED A SCREEN SAYING NOTHING WAS WAITING. Every
   * one of the ten rendered whatever the count was, including nought, and the
   * four panels each wrote a sentence about it — "Every page is published",
   * "No visitor corrections are waiting", "No listing candidates are waiting
   * for verification", "Nothing on the checklist is outstanding". Ten
   * containers, a full screen, to say there is no work.
   *
   * Two of the panels also had work and would not say how much: "Listings are
   * waiting for verification" and "Items are marked unfinished", with the
   * number sitting right there unused.
   *
   * So: one list, each entry with its own count, entries with nothing in them
   * left out, and one quiet line when the whole thing is empty.
   */
  const waiting: Array<{ label: string; count: number; href: string }> = [
    { label: "Messages not answered", count: messages.filter((m) => !m.answeredAt).length, href: "/admin/messages" },
    { label: "Plan requests", count: plansWaiting, href: "/admin/accounts" },
  ].filter((item) => item.count > 0 && may(item.href));
  const quickActions = [
    { href: "/admin/accounts", title: "Users", detail: "Accounts and invitations." },
    { href: "/admin/messages", title: "Messages", detail: "What people wrote in." },
    { href: "/admin/travel", title: "Travel providers", detail: "Flights, hotels and cars." },
    { href: "/admin/settings/earnings", title: "Earnings", detail: "Partners and placements." },
    { href: "/admin/duffel", title: "Duffel", detail: "Book flights here." },
    { href: "/admin/flight-itineraries", title: "Flight itineraries", detail: "Write up flights you sell." },
  ].filter((action) => may(action.href));
  const sections = ADMIN_SECTIONS.filter((section) => section.side === "itineraries" && section.href !== "/admin")
    .map((section) => ({ ...section, children: (section.children ?? []).filter((child) => may(child.href)) }))
    .filter((section) => may(section.href) || section.children.length > 0);

  return (
    <div className="pb-12">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--gold-light)] pb-7">
        <div>
          <PageHeader eyebrow="White Glove Itineraries" title="Dashboard" />
        </div>
        <div className="text-right">
          {/* Who is actually signed in. Before this the answer was "somebody
              with the password", which is not an answer. */}
          <p className="mb-2 text-xs leading-5 text-stone-500">{describeAdmin(signedInAs)}</p>
          {/* Only when it is not everything. Telling the owner he has
              everything is noise on his own dashboard. */}
          {areas && <p className="mb-2 text-xs leading-5 text-stone-500">{describeAreas(areas)}</p>}
          <AdminSignOut />
        </div>
      </header>

      {/* The one surface that actually demands action, so it comes first —
          before anything merely informational. */}
      {visibleAlerts.length > 0 && (
        <section aria-labelledby="attention-heading" className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id="attention-heading" className="font-[family-name:var(--font-display)] text-2xl text-amber-950">Needs attention</h2>
          </div>
          <ul className="mt-4 divide-y divide-amber-200">
            {visibleAlerts.map((alert) => (
              <li key={alert.href} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-amber-950">{alert.text}</p>
                <AdminNavLink href={alert.href} className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-amber-950 underline underline-offset-4">
                  {alert.label} →
                </AdminNavLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The owner's queue, in one place and above the launchers. Empty
          entries are gone rather than printed as nought, and an empty queue is
          one line rather than ten containers explaining itself. */}
      <section aria-labelledby="now-heading" className="mt-7">
        <h2 id="now-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Waiting on you</h2>
        {waiting.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">Nothing is waiting for you.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {waiting.map((item) => (
              <TotalCard key={item.label} label={item.label} value={item.count} href={item.href} />
            ))}
          </ul>
        )}
      </section>


      {quickActions.length > 0 && (
      <section aria-labelledby="quick-actions-heading" className="mt-9">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Common jobs</p>
        <h2 id="quick-actions-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Quick actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <QuickAction key={action.href} href={action.href} title={action.title} detail={action.detail} />
          ))}
        </div>
      </section>
      )}

      {/* The second copy of the queue used to be here — four panels, below two
          launcher sections, saying the same thing the cards above say and
          writing a sentence when there was nothing to say. It is gone; its
          counts are in the one list above. */}


      <section aria-labelledby="all-tools-heading" className="mt-10 border-t border-[var(--gold-light)] pt-9">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Full dashboard</p>
          <h2 id="all-tools-heading" className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Everything you can manage</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <section key={section.href} className={`${cardClass} p-5`}>
              {/* A section whose own front page is closed still opens — to the
                  first screen inside it this person may use. */}
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
