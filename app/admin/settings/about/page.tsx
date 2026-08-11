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
          <strong className="font-semibold text-[var(--navy)]">Where the business is based is the only one of these
          the public page needs.</strong>{" "}
          It appears as a sentence at the end of the opening paragraphs. The rest — name, photograph, experience,
          languages, why White Glove exists — are optional, stay off the page while they are blank, and nothing on the
          site asks for them.
        </p>
      </header>
      <AboutProfileForm current={profile} storeReady={storeReady} />
    </>
  );
}
