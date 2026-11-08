"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HOME_SEARCH_PHOTOS } from "@/data/homepage-search-photos";

const INTERVAL_MS = 9000;

export default function HomeSearchHero({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState<Set<number>>(() => new Set([0]));
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const photos = HOME_SEARCH_PHOTOS;
  const next = (active + 1) % photos.length;
  const running = motionAllowed && visible && !searchFocused;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setMotionAllowed(!media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!visible || ready.has(next)) return;
    let live = true;
    const image = new window.Image();
    const photo = photos[next];
    image.onload = () => {
      if (live) setReady(previous => new Set([...previous, next]));
    };
    image.srcset = photo.smallSrc + " 800w, " + photo.src + " 1600w";
    image.sizes = "100vw";
    image.src = photo.smallSrc;
    return () => {
      live = false;
      image.onload = null;
    };
  }, [next, photos, ready, visible]);

  useEffect(() => {
    if (!running || !ready.has(next)) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % photos.length), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [next, photos.length, ready, running]);

  const current = photos[active];
  return (
    <section
      className="wg-travel-hero relative flex min-h-[20rem] items-center bg-[var(--navy)] px-5 py-20 text-white sm:min-h-[24rem] sm:px-8 sm:py-24"
      data-search-photo={current.label}
      data-photo-playing={running ? "true" : "false"}
      onFocusCapture={event => setSearchFocused(Boolean((event.target as HTMLElement).closest("[data-hero-search]")))}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchFocused(false);
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--header-background)]">
        {photos.map((photo, index) => ready.has(index) ? (
          // Local responsive WebP variants are prepared once; no runtime image proxy.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.src} src={photo.smallSrc}
            srcSet={photo.smallSrc + " 800w, " + photo.src + " 1600w"} sizes="100vw"
            width={photo.width} height={photo.height} alt=""
            fetchPriority={index === 0 ? "high" : "auto"} decoding="async"
            className={"absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] motion-reduce:transition-none " + (index === active ? "opacity-100" : "opacity-0")} />
        ) : null)}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(42,35,27,.24),rgba(42,35,27,.04)_60%,rgba(42,35,27,.16))]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#30281f]/65 via-transparent to-[#30281f]/5" />
      </div>
      <div data-hero-search className="relative z-20 w-full">{children}</div>
    </section>
  );
}
