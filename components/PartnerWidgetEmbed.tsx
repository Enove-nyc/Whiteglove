"use client";

import { useEffect, useRef } from "react";

/**
 * Load a Travelpayouts search-form script where the form should appear.
 *
 * next/script afterInteractive renders null and appends to document.body, so
 * the iframe on /book stayed empty. A raw <script> in a Server Component is
 * also stripped or moved. Inserting the tag into this slot lets Travelpayouts
 * place the form next to it.
 */
export default function PartnerWidgetEmbed({ src }: { src: string }) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = slot.current;
    if (!root) return;
    if (!src.startsWith("https://tp.media/content?")) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("charset", "utf-8");
    root.appendChild(script);
    return () => {
      root.replaceChildren();
    };
  }, [src]);

  return <div ref={slot} className="min-h-[28rem] w-full" />;
}
