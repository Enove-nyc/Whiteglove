import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import PageBody from "@/components/PageBody";
import { visibleBlocks, type PageBlock } from "@/data/page-blocks";

// Renders a page built from blocks, in the site's own voice.
//
// Every block maps onto a shape the site already uses, so an edited page sits
// beside the hand-written ones without looking like it came from a different
// website. No raw HTML is ever rendered — the body text goes through PageBody,
// which only understands paragraphs, "## " headings and "- " bullets.

function Block({ block }: { block: PageBlock }) {
  switch (block.kind) {
    case "hero":
      return (
        <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            {block.eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{block.eyebrow}</p>
            )}
            {block.heading && (
              <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">
                {block.heading}
              </h1>
            )}
            {block.intro && <PageBody body={block.intro} className="mt-6 max-w-2xl text-lg leading-8 text-stone-600" />}
          </div>
        </section>
      );

    case "text":
      return (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          {block.heading && (
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">
              {block.heading}
            </h2>
          )}
          <PageBody body={block.body} className="mt-4 max-w-3xl text-lg leading-8 text-stone-600" />
        </section>
      );

    case "cards":
      return (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          {block.heading && (
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">
              {block.heading}
            </h2>
          )}
          {block.intro && <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">{block.intro}</p>}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.map((item, i) => (
              <article key={i} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-stone-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      );

    case "list":
      return (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          {block.heading && (
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">
              {block.heading}
            </h2>
          )}
          <ul className="glove-list mt-6 max-w-3xl space-y-3 text-lg leading-8 text-stone-600">
            {block.items.filter(Boolean).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      );

    case "image":
      if (!block.url) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <figure>
            <Image
              src={block.url}
              alt={block.alt}
              width={1600}
              height={900}
              unoptimized
              className="h-auto w-full border border-[var(--gold-light)] object-cover"
            />
            {block.caption && <figcaption className="mt-3 text-sm text-stone-500">{block.caption}</figcaption>}
          </figure>
        </section>
      );

    case "buttons":
      return (
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="flex flex-wrap gap-3">
            {block.items
              .filter((i) => i.label && i.href)
              .map((item, i) => {
                const className =
                  item.style === "outline"
                    ? "border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
                    : "border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]";
                return item.href.startsWith("/") ? (
                  <Link key={i} href={item.href} className={className}>
                    {item.label}
                  </Link>
                ) : (
                  <a key={i} href={item.href} target="_blank" rel="noreferrer" className={className}>
                    {item.label}
                  </a>
                );
              })}
          </div>
        </section>
      );

    case "quote":
      return (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <blockquote className="max-w-3xl border-l-4 border-[var(--gold)] pl-6">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-9 text-[var(--navy)]">{block.text}</p>
            {block.attribution && <footer className="mt-3 text-sm text-stone-500">{block.attribution}</footer>}
          </blockquote>
        </section>
      );

    case "note":
      return (
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <p
            className={`max-w-3xl border-l-4 px-4 py-3 text-sm leading-7 ${
              block.tone === "warn" ? "border-amber-400 bg-amber-50 text-amber-900" : "border-[var(--gold)] bg-[#fcfaf6] text-stone-700"
            }`}
          >
            {block.body}
          </p>
        </section>
      );
  }
}

export default function PageBlocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {visibleBlocks(blocks).map((block) => (
        <Fragment key={block.id}>
          <Block block={block} />
        </Fragment>
      ))}
    </>
  );
}
