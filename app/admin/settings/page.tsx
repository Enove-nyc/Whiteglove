import Link from "next/link";
import { passwordStorageAvailable } from "@/lib/access-passwords";
import { teamStorageAvailable } from "@/lib/admin-roles";
import { membershipPublicLabel } from "@/lib/growth-settings";
import { readCollaborationSettings, readMembershipSettings } from "@/lib/growth-settings-store";
import { publicReferralStatus } from "@/lib/referral";
import { readReferralSettings } from "@/lib/referral-store";
import { getDashboardStats } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

// Settings is a menu, not a wall. Each card says what it is for in the words
// the owner would use, and how it stands right now, so you can tell at a glance
// whether anything needs doing without opening every one.

function Card({ href, title, detail, state }: { href: string; title: string; detail: string; state?: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-6 transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
    >
      <span className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{title}</span>
      <span className="mt-2 text-sm leading-6 text-stone-600">{detail}</span>
      {state && <span className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{state}</span>}
    </Link>
  );
}

export default async function AdminSettingsPage() {
  const [stats, referral, collaboration, membership] = await Promise.all([
    getDashboardStats(),
    readReferralSettings(),
    readCollaborationSettings(),
    readMembershipSettings(),
  ]);
  const referralStatus = publicReferralStatus(referral);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Who can get in, what the website costs and earns, and the services it depends on. You need these rarely.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">The website itself</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/admin/settings/words"
            title="The website’s words"
            detail="The headline on the front page, the address people write to, pricing answers, the line in the footer."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/about"
            title="About — who you are"
            detail="Name, photograph, location, experience, languages, and why White Glove exists. Blank fields stay hidden."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/proof"
            title="Case studies"
            detail="Genuine trip outcomes with permission. Nothing public until complete and approved. No invented reviews."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/limits"
            title="What a free account gets"
            detail="How many trips a Traveler can plan, and how many printable copies a week."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/earnings"
            title="What the searches earn"
            detail="Partners for flights, hotels and cars, travel extras, and which booking options show on destination pages."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/travel-essentials"
            title="Travel Essentials"
            detail="Enable insurance, eSIM, transfers, tours, cars, flights and stays — with URLs, placements and order."
            state={stats.configured ? undefined : "Needs the private store"}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Growth programmes</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
          Customer updates and programmes that stay off until you approve them. Demand numbers live under Pages.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/admin/alerts"
            title="Email alerts"
            detail="Who asked for destination, seasonal and listing updates — consent and unsubscribe."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/growth"
            title="Search and bookings"
            detail="Common searches, empty results, affiliate clicks and alert signup counts."
            state={stats.configured ? "Open the dashboard" : "Needs the private store"}
          />
          <Card
            href="/admin/settings/referral"
            title="Referral programme"
            detail="Unique links and attribution. Disabled until reward rules are final — no invented amounts."
            state={referralStatus.open ? "On for visitors" : "Disabled by default"}
          />
          <Card
            href="/admin/settings/collaboration"
            title="Group planning tools"
            detail="Voting, shared favorites and room groupings on shared itineraries."
            state={
              collaboration.votingEnabled || collaboration.sharedFavoritesEnabled || collaboration.roomGroupsEnabled
                ? "Tools available"
                : "All tools off"
            }
          />
          <Card
            href="/admin/settings/membership"
            title="White Glove Plus"
            detail="Planned membership foundation only. Not priced, advertised or sold."
            state={membershipPublicLabel(membership)}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Access</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/admin/settings/website"
            title="Website access"
            detail="Open the website to everyone, close it, or close only certain parts."
            state={stats.siteLocked ? "Closed to the public" : "Open to everyone"}
          />
          <Card
            href="/admin/team"
            title="People with access"
            detail="Let someone see the site while it is closed, or help you run it."
            state={teamStorageAvailable() ? undefined : "Needs the private store"}
          />
          <Card
            href="/admin/settings/passwords"
            title="Passwords"
            detail="Change the code for the admin area and the code visitors use when the site is closed."
            state={passwordStorageAvailable() ? undefined : "Set in the host for now"}
          />
          <Card
            href="/admin/settings/trello"
            title="Cards on your Trello board"
            detail="Send pictures, listing requests and reports to your team's board, with a link back to the screen that handles each one."
            state={stats.configured ? undefined : "Needs the private store"}
          />
          <Card href="/admin/accounts" title="Visitor accounts" detail="Everyone who has signed up, and what they have saved." />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">The business</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card href="/admin/finances" title="Finances" detail="Money in and out, and what each trip cost." />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Advanced</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
          The outside services the website uses. If something on the site has stopped working, the answer is usually
          here — but nothing here needs your attention day to day.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/admin/settings/connections"
            title="Connections"
            detail="Whether email, driving times and the travel assistant are actually working."
            state={stats.configured ? undefined : "Private store not connected"}
          />
          <Card
            href="/admin/duffel"
            title="Duffel flights"
            detail="Search and ticket directly from the admin. Not on the public site."
          />
        </div>
      </section>
    </>
  );
}
