"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HOME_SEARCH_PHOTOS } from "@/data/homepage-search-photos";

const INTERVAL_MS = 9000;

export default function HomeSearchHero({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState<Set<number>>(() => new Set([0]));
  const [paused, setPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const photos = HOME_SEARCH_PHOTOS;
  const next = (active + 1) % photos.length;
  const running = motionAllowed && !paused && visible && !searchFocused;

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br from-[#164b60] via-[#247f87] to-[#75b6b0]">
        {photos.map((photo, index) => ready.has(index) ? (
          // Local responsive WebP variants are prepared once; no runtime image proxy.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.src} src={photo.smallSrc}
            srcSet={photo.smallSrc + " 800w, " + photo.src + " 1600w"} sizes="100vw"
            width={photo.width} height={photo.height} alt=""
            fetchPriority={index === 0 ? "high" : "auto"} decoding="async"
            className={"absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] motion-reduce:transition-none " + (index === active ? "opacity-100" : "opacity-0")} />
        ) : null)}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(12,45,64,.32),rgba(10,49,58,.10)_60%,rgba(10,31,49,.22))]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d263c]/85 via-transparent to-[#15384c]/10" />
      </div>
      <div data-hero-search className="relative z-20 w-full">{children}</div>
      <div className="absolute inset-x-5 bottom-4 z-10 mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 sm:inset-x-8 sm:bottom-5">
        <p className="text-xs font-medium leading-6 text-white drop-shadow-sm" aria-live="off">
          {current.label}
          <a href={"/sources#photo-" + current.creditId} className="ml-3 inline-flex min-h-11 items-center text-[11px] text-white underline decoration-white/60 underline-offset-4 hover:decoration-white" aria-label={"Photo credits for " + current.label}>Credits</a>
        </p>
        <div role="group" aria-label="Background photo controls" className="flex gap-2">
          {motionAllowed ? (
            <button type="button" onClick={() => setPaused(value => !value)}
              aria-label={paused ? "Play background photos" : "Pause background photos"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-[#102d42]/80 px-4 text-xs font-semibold text-white backdrop-blur-sm hover:bg-[#102d42] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>{paused ? "Play" : "Pause"}
            </button>
          ) : null}
          <button type="button" aria-label="Next background photo" disabled={!ready.has(next)}
            onClick={() => { setActive(next); setPaused(true); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-[#102d42]/80 px-4 text-xs font-semibold text-white backdrop-blur-sm hover:bg-[#102d42] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
