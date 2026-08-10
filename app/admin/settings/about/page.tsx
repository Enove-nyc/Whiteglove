import AboutProfileForm from "@/components/AboutProfileForm";
import { aboutProfileStoreAvailable, readAboutProfileFresh } from "@/lib/about-profile-store";

export const dynamic = "force-dynamic";

export default async function AboutSettingsPage() {
  const [profile, storeReady] = await Promise.all([readAboutProfileFresh(), Promise.resolve(aboutProfileStoreAvailable())]);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">About — who you are</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Name, photograph, where you work from, experience, languages, and why White Glove exists. Blank fields stay
          off the public page. The general “small independent travel outfit” line remains until you fill something in.
        </p>
      </header>
      <AboutProfileForm current={profile} storeReady={storeReady} />
    </>
  );
}
