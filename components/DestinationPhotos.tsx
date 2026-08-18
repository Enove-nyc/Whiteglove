import type { DestinationPhoto } from "@/lib/vacation-destinations-view";

/**
 * The pictures of a destination, when there are any.
 *
 * THERE NEVER WERE ANY UNTIL NOW. The site could hold a photograph of a town
 * or of a beis hachaim, but not of Rome — a holiday destination had no way to
 * carry one, which is why every destination page was words alone.
 *
 * EVERY PICTURE CARRIES ITS CREDIT, visibly, under it. That is not decoration
 * either: a photograph belongs to whoever took it, and the site publishes one
 * on the strength of being allowed to. lib/photos.ts holds a picture back to
 * draft until somebody says whose it is, so an uncredited one never reaches
 * this component — the line below is the promise that rule exists to keep.
 *
 * Renders nothing at all when there are no pictures, rather than an empty
 * frame. An unfinished section is hidden until it has something in it.
 */
export default function DestinationPhotos({ photos, name }: { photos: readonly DestinationPhoto[]; name: string }) {
  if (!photos.length) return null;

  return (
    <section aria-label={`Pictures of ${name}`} className="mt-10">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id} className="overflow-hidden rounded-xl border border-[var(--gold-light)] bg-[var(--surface)]">
            {/* Plain <img>: these are owner-uploaded URLs of unknown origin,
                and next/image would need every one of those hosts declared in
                the config before the page could render at all. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ? `${name} — ${photo.caption}` : name}
              loading="lazy"
              className="h-52 w-full object-cover"
            />
            {(photo.caption || photo.credit) && (
              <div className="px-4 py-3">
                {photo.caption && <p className="text-sm leading-6 text-stone-600">{photo.caption}</p>}
                {photo.credit && (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                    {photo.credit}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
