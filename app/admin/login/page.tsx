import AccessForm from "@/components/AccessForm";
import Footer from "@/components/Footer";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cream)]">
      <div className="grid flex-1 place-items-center px-5 py-16">
        <section className="w-full max-w-md border border-[var(--gold-light)] bg-[#fcfaf6] p-8 shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove Kosher Travel</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Owner&apos;s dashboard</h1><p className="mt-5 leading-7 text-stone-600">Private access for website activity and launch controls.</p><AccessForm scope="admin" /></section>
      </div>
      <Footer />
    </main>
  );
}
