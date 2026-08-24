import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgencyJoinCard from "@/components/AgencyJoinCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { accountCookieName, getAccountRecord, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { readAgency, readInvite } from "@/lib/agency-store";
import { describeIdentity, identityKey } from "@/lib/identity";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

/** Not inlined into the component below — reading the clock is not something a component body may do directly. */
function isExpired(iso: string): boolean {
  return Date.parse(iso) < Date.now();
}

export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Join an agency | White Glove Itineraries" : "Join an agency | White Glove Kosher Travel",
    description: "Accept an invitation to join an agency.",
    path: "/agency/join",
    noIndex: true,
  });
}

/**
 * The page an invite email's link opens.
 *
 * READS THE INVITE BUT NEVER ACCEPTS IT. Only a button press does that, over
 * a POST to /api/account/agency/join — see the note there on why a GET must
 * never have this side effect. This page's whole job is showing who invited
 * whom clearly enough that pressing the button is an informed yes.
 */
export default async function AgencyJoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";

  if (!token) {
    return <Problem title="No invitation here." body="This link is missing its invitation code. Ask for the email again." />;
  }
  if (!who) {
    redirect(`/login?next=${encodeURIComponent(`/agency/join?token=${token}`)}`);
  }

  const invite = await readInvite(token);
  if (!invite) {
    return <Problem title="That invitation is gone." body="It may already have been accepted, withdrawn, or it has expired. Ask for a new one." />;
  }
  if (isExpired(invite.expiresAt)) {
    return <Problem title="That invitation has expired." body="Ask whoever invited you to send another." />;
  }

  const agency = await readAgency(invite.agencyId);
  if (!agency) {
    return <Problem title="That agency is not there." body="Whoever invited you can explain what happened." />;
  }

  const ownerRecord = await getAccountRecord(invite.invitedBy);
  const ownerName = ownerRecord?.name || describeIdentity(invite.invitedBy);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">Agency invitation</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          {ownerName} invited you.
        </h1>
        <p className="text-base leading-7 text-stone-600">
          Accepting puts <strong>{describeIdentity(who)}</strong> on {ownerName}&rsquo;s agency: Advisor Pro, the same
          letterhead the rest of the team uses, and your own trips stay your own — nobody else on the agency sees them
          unless you share one the way you always could.
        </p>
        <AgencyJoinCard
          token={token}
          matches={identityKey(invite.email) === identityKey(who)}
          invitedEmail={invite.email}
          signedInAs={who}
        />
      </section>
      <Footer />
    </main>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16 sm:px-8 sm:py-24">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{title}</h1>
        <p className="text-base leading-7 text-stone-600">{body}</p>
      </section>
      <Footer />
    </main>
  );
}
