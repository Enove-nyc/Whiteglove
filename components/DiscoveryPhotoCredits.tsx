import { discoveryPhotos } from "@/data/discovery-photos.generated";

export default function DiscoveryPhotoCredits() {
  return (
    <section id="discovery-photography" className="mt-14 scroll-mt-24">
      <h2 className="border-b border-[var(--gold-light)] pb-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Destination and place photography</h2>
      <p className="mt-4 text-sm leading-6 text-stone-600">Real photographs reused under the licenses below. Each credit links to its original file and license. Images are resized and converted to WebP, and may be cropped to fit a card.</p>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {Object.values(discoveryPhotos.credits).map((credit) => (
          <li id={`photo-${credit.id}`} key={credit.id} className="scroll-mt-28 break-words rounded-xl border border-[var(--gold-light)] bg-white p-4 text-sm leading-6">
            <a href={credit.sourcePage} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline underline-offset-2">{credit.title}</a>
            <p className="mt-1 text-stone-600">{credit.author}</p>
            <a href={credit.licenseUrl} target="_blank" rel="noreferrer" className="text-[var(--gold-ink)] underline underline-offset-2">{credit.license}</a>
            <p className="mt-1 text-xs text-stone-600">{credit.changes}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
