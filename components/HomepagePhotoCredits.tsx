import { HOME_PHOTOGRAPHS } from "@/data/homepage-photos";

export default function HomepagePhotoCredits() {
  return (
    <section id="photography" className="mt-14 scroll-mt-24 border-t border-[var(--gold-light)] pt-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Homepage photo credits</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">These photographs have been cropped, resized and converted to WebP. Each photograph retains its stated license.</p>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {HOME_PHOTOGRAPHS.map((photo) => (
          <li key={photo.key} className="text-sm leading-7 text-stone-700">
            <p className="font-semibold text-[var(--navy)]">{photo.title}</p>
            <p>{photo.attribution || photo.author}</p>
            <p><a href={photo.sourcePage} className="underline underline-offset-4">Original photograph</a>{" · "}<a href={photo.licenseUrl} className="underline underline-offset-4">{photo.license}</a></p>
          </li>
        ))}
      </ul>
    </section>
  );
}
