"use client";

import { useState } from "react";
import type { PlacePhoto as Photo } from "@/lib/discovery-photo-types";

/** Local, pre-sized photos need no image proxy or per-visitor provider calls. */
export default function PlacePhoto({ photo }: { photo?: Photo }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!photo || failedSrc === photo.src) return null;
  return (
    <figure className="mb-4 overflow-hidden rounded-xl bg-sky-50">
      {/* These checked local WebP files are already bounded and compressed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height}
        loading="lazy" decoding="async" onError={() => setFailedSrc(photo.src)}
        className="aspect-[3/2] w-full object-cover" />
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-[11px] leading-5 text-slate-600">
        {photo.context ? <span>{photo.context}</span> : <span className="sr-only">{photo.alt}</span>}
        <a href={`/sources#photo-${photo.creditId}`} className="ml-auto inline-flex min-h-8 items-center underline underline-offset-2 hover:text-[var(--navy)]">Photo credits</a>
      </figcaption>
    </figure>
  );
}
