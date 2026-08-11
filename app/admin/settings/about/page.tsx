import AboutProfileForm from "@/components/AboutProfileForm";
import { aboutProfileStoreAvailable, readAboutProfileFresh } from "@/lib/about-profile-store";

export const dynamic = "force-dynamic";

export default async function AboutSettingsPage() {
  const [profile, storeReady] = await Promise.all([readAboutProfileFresh(), Promise.resolve(aboutProfileStoreAvailable())]);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">About</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          <strong className="font-semibold text-[var(--navy)]">Nothing on this screen is required, and the About page
          is finished without any of it.</strong>{" "}
          It already says what the site is for and what its information is worth, which is what a visitor is deciding
          about. Every field here is optional, stays off the page while it is blank, and none of them is a gap.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Fill one in only if you want it public. “Where” is for a business with a place; a website does not need one,
          and leaving it empty is the normal state rather than an unfinished one.
        </p>
      </header>
      <AboutProfileForm current={profile} storeReady={storeReady} />
    </>
  );
}
