"use client";

/**
 * White Glove frame around a partner search widget.
 *
 * The iframe loads our /embed pages, which put a native script tag in the
 * document. Travelpayouts inserts the form next to that tag; putting the
 * script on a same-origin embed page keeps it inside this panel instead of
 * at the bottom of /book. The marker never enters this file.
 */

export default function PartnerSearchWidget({
  src,
  title,
  minHeight = 480,
}: {
  src: string;
  title: string;
  minHeight?: number;
}) {
  if (!src) return null;
  return (
    <iframe
      key={src}
      src={src}
      title={title}
      className="mt-4 w-full rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6]"
      style={{ minHeight }}
      loading="lazy"
    />
  );
}
