import { ABOUT_INTRO, type AboutProfile } from "@/data/about-profile";
import { isSafeAboutPhotoUrl } from "@/lib/about-profile";

/**
 * The top of the About page.
 *
 * WRITTEN FOR A PAGE WITH NO BIOGRAPHY ON IT. The owner has decided this page
 * carries no name and no background — only where the business is based — so
 * the old shape was wrong twice over. It asked "Who you are dealing with." and
 * then answered with nobody, and it put the one fact he does want to give
 * behind a small "WHERE" label in a two-column grid built for a photograph and
 * a career history that are never coming.
 *
 * So the intro paragraphs are the page, the heading is about what a reader
 * gets rather than who they are meeting, and the location is a sentence in the
 * flow of it.
 *
 * The personal grid is still here and still works. Nothing about this decision
 * is irreversible: fill any of those fields in and they appear, exactly as
 * before. What has gone is the page implying they are missing.
 */
export default function AboutProfileSection({ profile }: { profile: AboutProfile }) {
  // Location is deliberately not in this list. It is shown in the paragraphs
  // below, so counting it here would open an empty grid beside them.
  const hasBio = Boolean(
    profile.name ||
      profile.experience ||
      profile.languages ||
      profile.whyCreated ||
      (profile.photoUrl && profile.photoAlt && isSafeAboutPhotoUrl(profile.photoUrl)),
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">About White Glove</p>
      <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
        Travel information you can plan around.
      </h1>

      <div className="mt-6 max-w-3xl space-y-5">
        {ABOUT_INTRO.map((line, index) => (
          <p key={line} className={index === 0 ? "text-lg leading-8 text-stone-600" : "leading-7 text-stone-600"}>
            {line}
          </p>
        ))}
        {/* The one personal fact the page carries, as a sentence rather than a
            label — it reads as part of the paragraph above it, which is what
            "only where my business is based" should look like. */}
        {profile.location && (
          <p className="leading-7 text-stone-600">
            White Glove Itineraries is based in {profile.location}.
          </p>
        )}
      </div>

      {hasBio && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:items-start">
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
          </div>
        </div>
      )}
    </section>
  );
}
