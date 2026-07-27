import Link from "next/link";
import Footer from "@/components/Footer";
import { hasAccountStorage, listAllAccounts } from "@/lib/account-store";

export const dynamic = "force-dynamic";

function fmtDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function AdminAccountsPage() {
  const available = hasAccountStorage();
  const accounts = available ? await listAllAccounts() : [];
  const verified = accounts.filter((a) => a.verifiedAt).length;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Accounts</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Everyone who has registered on the site. Passwords are stored only in a hashed form and are never shown here.</p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {!available ? (
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
            <p className="text-sm leading-7 text-stone-600">The private account store isn&apos;t connected, so there are no accounts to show yet.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-6 border border-[var(--gold-light)] bg-[var(--cream-deep)] p-5">
              <div><p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{accounts.length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Total accounts</p></div>
              <div><p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{verified}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Email-verified</p></div>
              <div><p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{accounts.filter((a) => a.hasItinerary).length}</p><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Building an itinerary</p></div>
            </div>

            {accounts.length === 0 ? (
              <div className="border border-dashed border-[var(--gold-light)] p-10 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">No accounts yet.</p>
                <p className="mt-2 text-sm text-stone-600">Registered travelers will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--gold-light)] bg-[#fcfaf6]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-[var(--gold-light)] text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Verified</th>
                      <th className="px-4 py-3">Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gold-light)]">
                    {accounts.map((a) => (
                      <tr key={a.email} className="text-stone-700">
                        <td className="px-4 py-3 font-semibold text-[var(--navy)]">{a.name || "—"}</td>
                        <td className="px-4 py-3"><a href={`mailto:${a.email}`} className="underline decoration-[var(--gold)] underline-offset-2">{a.email}</a></td>
                        <td className="px-4 py-3">{a.phone ? <a href={`tel:${a.phone.replace(/[^+\d]/g, "")}`} className="underline decoration-[var(--gold-light)] underline-offset-2">{a.phone}</a> : "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                        <td className="px-4 py-3">{a.verifiedAt ? <span className="text-emerald-700">Yes</span> : <span className="text-stone-400">No</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-500">{a.routeCount} route · {a.favoriteCount} fav{a.hasItinerary ? " · itinerary" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-stone-400">
              This list is private to the owner. Only handle travelers&apos; details in line with your privacy policy — they entrusted their name, email, and phone to book with you.
            </p>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
