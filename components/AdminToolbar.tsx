"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_TOOLS, ADMIN_TOOL_GROUPS } from "@/lib/admin-tools";

/**
 * The bar that sits on top of every admin page.
 *
 * The point is that you never have to go back to the dashboard to get
 * somewhere: press "/" or click the box, type two letters of what you want —
 * the thing itself ("shomer", "ads") or what you are trying to do ("phone
 * number", "grave") — and go straight there.
 */
export default function AdminToolbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_TOOLS;
    return ADMIN_TOOLS.filter((t) => `${t.name} ${t.blurb} ${t.keywords}`.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const current = ADMIN_TOOLS.find((t) => pathname === t.href);

  // Nothing to navigate to before you are signed in, and no reason to show a
  // stranger the shape of the admin area.
  if (pathname === "/admin/login") return null;

  return (
    <div className="border-b border-[var(--gold-light)] bg-[#fcfaf6]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
        <Link href="/admin" className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
          WG Admin
        </Link>
        {current && (
          <>
            <span aria-hidden="true" className="text-[var(--gold-light)]">/</span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{current.name}</span>
          </>
        )}

        <div ref={boxRef} className="relative ml-auto w-full sm:w-80">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, Math.min(matches.length - 1, e.key === "ArrowDown" ? i + 1 : i - 1)));
              } else if (e.key === "Enter" && matches[active]) {
                window.location.href = matches[active].href;
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Go to…  (press /)"
            className="w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
          />
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[20rem] border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_18px_40px_rgba(23,45,82,.18)]">
              {matches.length === 0 ? (
                <p className="px-3 py-3 text-sm text-stone-600">Nothing here matches that.</p>
              ) : (
                <ul className="max-h-80 overflow-auto">
                  {matches.map((t, i) => (
                    <li key={t.href}>
                      <Link
                        href={t.href}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => setOpen(false)}
                        className={`block px-3 py-2 ${i === active ? "bg-[var(--cream-deep)]" : ""}`}
                      >
                        <span className="block text-sm font-semibold text-[var(--navy)]">{t.name}</span>
                        <span className="block text-xs text-stone-500">{t.blurb}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-[var(--gold-light)] px-3 py-1.5 text-[11px] text-stone-500">
                {ADMIN_TOOL_GROUPS.length} sections · {ADMIN_TOOLS.length} screens
              </p>
            </div>
          )}
        </div>

        {/* An absolute URL when one is configured: on an admin hostname "/" is
            the dashboard, so a relative link would never leave the admin area. */}
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "/"}
          className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
        >
          View site
        </a>
      </div>
    </div>
  );
}
