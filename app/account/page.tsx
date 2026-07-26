import Link from "next/link";
import { cookies } from "next/headers";
import AccountRoutePanel from "@/components/AccountRoutePanel";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import Navbar from "@/components/Navbar";
import { accountCookieName, getCurrentAccountSummary } from "@/lib/account-store";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountSummary(cookieStore.get(accountCookieName())?.value);
  const displayName = account?.name || account?.email?.split("@")[0] || "Traveler";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">Your White Glove account</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Welcome, {displayName}.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">This is where your saved destinations, personal notes, and future itineraries live.</p>
          </div>
          <LogoutButton />
        </div>
        <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 text-sm leading-7 text-stone-600">
          {account ? (
            <p>Signed in as {account.email}. {account.verifiedAt ? "Email verified." : "Email verification pending."} {account.routeCount} route items and {account.favoriteCount} favorites are stored in your account.</p>
          ) : (
            <p>You are viewing the local preview. Sign in to store your route and favorites across devices.</p>
          )}
        </div>
        <AccountRoutePanel />
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
