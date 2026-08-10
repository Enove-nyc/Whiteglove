import { ABOUT_FALLBACK_INTRO, type AboutProfile } from "@/data/about-profile";
import { aboutProfileHasPublicContent, isSafeAboutPhotoUrl } from "@/lib/about-profile";

/**
 * Personal half of the About page.
 *
 * Empty fields are omitted. With nothing filled in, only the general
 * “small independent travel outfit” fallback shows — never invented credentials.
 */
export default function AboutProfileSection({ profile }: { profile: AboutProfile }) {
  const hasPersonal = aboutProfileHasPublicContent(profile);

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">About White Glove</p>
      <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
        Who you are dealing with.
      </h1>

      {!hasPersonal && <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{ABOUT_FALLBACK_INTRO}</p>}

      {hasPersonal && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:items-start">
          {profile.photoUrl && profile.photoAlt && isSafeAboutPhotoUrl(profile.photoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded blob via /api/media
            <img
              src={profile.photoUrl}
              alt={profile.photoAlt}
              className="aspect-[4/5] w-full max-w-[220px] object-cover"
            />
          )}
          <div className="space-y-5">
            {profile.name && (
              <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{profile.name}</p>
            )}
            {profile.location && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Where</p>
                <p className="mt-1 leading-7 text-stone-600">{profile.location}</p>
              </div>
            )}
            {profile.experience && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Experience</p>
                <p className="mt-1 leading-7 text-stone-600">{profile.experience}</p>
              </div>
            )}
            {profile.languages && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Languages</p>
                <p className="mt-1 leading-7 text-stone-600">{profile.languages}</p>
              </div>
            )}
            {profile.whyCreated && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Why White Glove</p>
                <p className="mt-1 leading-7 text-stone-600">{profile.whyCreated}</p>
              </div>
            )}
            {!profile.name && !profile.whyCreated && (
              <p className="leading-7 text-stone-600">{ABOUT_FALLBACK_INTRO}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
