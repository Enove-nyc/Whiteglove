import AccessForm from "@/components/AccessForm";
import Footer from "@/components/Footer";

import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";

// Private to one person. Nothing here belongs in a search result.
export async function generateMetadata() {
  const name = BRAND_NAME[await currentBrand()];
  return pageMetadata({
    title: `Enter the access code | ${name}`,
    description: "This part of the site is private while it is being prepared.",
    path: "/access",
    noIndex: true,
  });
}

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const siteName = BRAND_NAME[await currentBrand()];
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cream)]">
      <div className="grid flex-1 place-items-center px-5 py-16">
      <section className="wg-card w-full max-w-md border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">{siteName}</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">We are preparing something beautiful.</h1><p className="mt-5 leading-7 text-stone-600">This website is currently private while White Glove is being prepared. Please enter the access password to continue.</p><AccessForm scope="site" next={next} /></section>
      </div>
      <Footer />
    </main>
  );
}
