import Link from "next/link";
import { cookies } from "next/headers";
import AccountRoutePanel from "@/components/AccountRoutePanel";
import AccountSettings from "@/components/AccountSettings";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import Navbar from "@/components/Navbar";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { isAdminAccount } from "@/lib/admin-roles";
import { describeIdentity, isPhoneIdentity } from "@/lib/identity";

import { pageMetadata } from "@/lib/seo";

// Private to one person. Nothing here belongs in a search result.
export const metadata = pageMetadata({
  title: "Your account | White Glove Itineraries",
  description: "Your saved route, itineraries and account settings.",
  path: "/account",
  noIndex: true,
});

export default async function AccountPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  // A valid signed session means you're signed in, even if the saved record
  // can't be read at this moment.
  const sessionEmail = readSessionEmail(cookie);
  const signedIn = Boolean(account || sessionEmail);
  // Someone who helps run the site gets a way through to the admin from their
  // own account, rather than having to remember a separate address.
  const canAdmin = await isAdminAccount(account?.email || sessionEmail);
  // A phone account has no "@" to cut a name out of, so fall back to the
  // number spelled readably rather than to a blank greeting.
  const identity = account?.email ?? sessionEmail ?? "";
  const displayName =
    account?.name || (isPhoneIdentity(identity) ? describeIdentity(identity) : identity.split("@")[0]) || "Traveler";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">Your White Glove account</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">Welcome, {displayName}.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">This is where your saved destinations, personal notes, and future itineraries live.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canAdmin && (
              <Link
                href="/admin"
                className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                Open the admin area →
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
        <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 text-sm leading-7 text-stone-600">
          {account ? (
            <p>Signed in as {describeIdentity(account.email)}. {account.verifiedAt ? "Verified." : "Still waiting for its verification code."} {account.routeCount} route items and {account.favoriteCount} favorites are stored in your account.</p>
          ) : signedIn ? (
            <p>Signed in as {describeIdentity(sessionEmail ?? "")}. Your saved route and favorites will appear here once your account data loads.</p>
          ) : (
            <p>You are viewing the local preview. Sign in to store your route and favorites across devices.</p>
          )}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Link href="/itinerary" className="group flex flex-col justify-between border border-[var(--gold-light)] bg-[#fcfaf6] p-6 transition hover:border-[var(--gold)] hover:shadow-md">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Plan your trip</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Itinerary planner</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">Build a day-by-day plan — flights, hotels, and stops — with distances, free-time tips, and a printable PDF.</p>
            </div>
            <span className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition group-hover:text-[var(--gold)]">Open the planner →</span>
          </Link>
          <Link href="/my-route" className="group flex flex-col justify-between border border-[var(--gold-light)] bg-[#fcfaf6] p-6 transition hover:border-[var(--gold)] hover:shadow-md">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your saved places</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">My Route</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">The kevarim, destinations, and favorites you&apos;ve saved — gathered in one place for your journey.</p>
            </div>
            <span className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition group-hover:text-[var(--gold)]">Open my route →</span>
          </Link>
        </div>
        <AccountRoutePanel loggedIn={signedIn} />
        {(account || sessionEmail) && (
          <AccountSettings initial={{ name: account?.name, email: account?.email ?? sessionEmail ?? "", phone: account?.phone }} />
        )}
        <div className="mt-10 border border-[var(--gold-light)] bg-[var(--navy)] p-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Start exploring</p>
            <p className="mt-2 text-xl">Choose a destination to begin building your own collection.</p>
          </div>
          <Link href="/stops" className="mt-5 inline-block shrink-0 border border-[var(--gold-light)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-[var(--gold)] hover:text-[var(--navy)] sm:mt-0">Browse destinations</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
