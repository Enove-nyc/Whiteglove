import AccessForm from "@/components/AccessForm";
import Footer from "@/components/Footer";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cream)]">
      <div className="grid flex-1 place-items-center px-5 py-16">
        <section className="w-full max-w-md border border-[var(--gold-light)] bg-[#fcfaf6] p-8 shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove Itineraries</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">We are preparing something beautiful.</h1><p className="mt-5 leading-7 text-stone-600">This website is currently private while White Glove is being prepared. Please enter the access password to continue.</p><AccessForm scope="site" next={next} /></section>
      </div>
      <Footer />
    </main>
  );
}
