import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SupplierDirectoryList from "@/components/SupplierDirectoryList";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail, resolveBusinessOwner } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { LinkButton } from "@/components/ui/Button";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

// Every supplier the agency has logged a commission booking with, rolled up
// across every trip. Not a marketplace — see data/supplier-directory.ts for
// why a real one isn't what this builds.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Suppliers | White Glove Itineraries" : "Suppliers | White Glove Kosher Travel",
    description: "Every supplier you've logged a booking with, and how much business has gone through each.",
    path: "/suppliers",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";
  if (!who) redirect("/login?next=%2Fsuppliers");

  const plan = await getPlan(await resolveBusinessOwner(who));
  if (!mayServeCompanionClients(plan)) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <PageHeader
            eyebrow="Suppliers"
            title="Part of a Business account."
            description="The supplier directory rolls up every hotel, tour operator or airline you've logged a commission booking with — how many trips, and how much business has gone through each."
          />
          <LinkButton href="/account" className="w-fit">Ask about Business</LinkButton>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <PageHeader
          eyebrow="Suppliers"
          title="Your suppliers"
          description="Every supplier you've logged a commission booking with — see Commissions to log one."
        />
        <div className="mt-8">
          <SupplierDirectoryList />
        </div>
      </section>
      <Footer />
    </main>
  );
}
