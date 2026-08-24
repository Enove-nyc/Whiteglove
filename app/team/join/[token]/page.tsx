import { cookies } from "next/headers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TeamJoinButton from "@/components/TeamJoinButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { accountCookieName, getAccountRecord, getTeamInvite, readSessionEmail } from "@/lib/account-store";
import { describeIdentity } from "@/lib/identity";
import { pageMetadata } from "@/lib/seo";

// A staff invite link — see app/api/account/team/route.ts, which creates the
// token, and lib/account-store.ts's acceptTeamInvite. Noindexed for the same
// reason a client's app link or a proposal link is: it belongs to one person.
export const metadata = pageMetadata({
  title: "Join the team",
  description: "Accept an invitation to join a business account as staff.",
  path: "/team/join",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function TeamJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getTeamInvite(token);
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const signedIn = Boolean(readSessionEmail(cookie));

  if (!invite) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
          <EmptyState
            title="This invite isn't active"
            description="The link may have already been used, or the invitation was withdrawn. Ask whoever invited you to send a fresh one."
            action={<LinkButton href="/">Back to White Glove</LinkButton>}
          />
        </section>
        <Footer />
      </main>
    );
  }

  const owner = await getAccountRecord(invite.ownerEmail);
  const ownerName = owner?.name?.trim() || describeIdentity(invite.ownerEmail);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
        <PageHeader
          eyebrow="Staff invite"
          title={`Join ${ownerName}'s team`}
          description="You'll sign in with your own email and password, and see the same trips, clients and pipeline they do. Nothing about your own account changes except which business it works for."
        />
        {signedIn ? (
          <TeamJoinButton token={token} />
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={`/login?next=${encodeURIComponent(`/team/join/${token}`)}`}>Log in or create an account</LinkButton>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
