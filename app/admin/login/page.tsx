import AccessForm from "@/components/AccessForm";

export default function AdminLoginPage() {
  return <main className="grid min-h-screen place-items-center bg-[var(--cream)] px-5"><section className="w-full max-w-md border border-[var(--gold-light)] bg-[#fcfaf6] p-8 shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove Itineraries</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Owner&apos;s dashboard</h1><p className="mt-5 leading-7 text-stone-600">Private access for website activity and launch controls.</p><AccessForm scope="admin" /></section></main>;
}
