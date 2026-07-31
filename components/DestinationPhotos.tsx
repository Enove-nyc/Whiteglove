import type { Photo } from "@prisma/client";

/**
 * The pictures on a destination page.
 *
 * The credit is shown, always, under the picture. It is not fine print: it is
 * the reason the picture may be here at all, and a photograph published
 * without saying whose it is looks exactly like one taken without asking.
 */
export default function DestinationPhotos({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Pictures</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id} className="border border-[var(--gold-light)] bg-[#fcfaf6]">
            {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded
                blob served from /api/media; next/image cannot optimise it and
                would only add a second fetch. */}
            <img
              src={photo.url}
              alt={photo.caption ?? ""}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="p-3">
              {photo.caption && <p className="text-sm leading-6 text-stone-700">{photo.caption}</p>}
              {photo.credit && (
                <p className="mt-1 text-xs text-stone-500">
                  {photo.sourceUrl ? (
                    <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-[var(--gold-light)] underline-offset-2">
                      {photo.credit}
                    </a>
                  ) : (
                    photo.credit
                  )}
                </p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
