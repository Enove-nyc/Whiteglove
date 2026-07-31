"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminTrail from "@/components/AdminTrail";
import { ADMIN_SECTIONS, activeSection, adminHref, allAdminDestinations, toAdminPath } from "@/lib/admin-nav";

/**
 * The frame every admin screen sits in.
 *
 * Five places down the left, the screens of whichever one you are in listed
 * underneath it, and a "go to" box that jumps anywhere. No visitor navigation
 * and no public footer — this is a workplace, not a page of the website.
 *
 * On a phone the nav collapses to a button; the content is what matters on a
 * small screen, and the nav is one tap away.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [active, setActive] = useState(0);
  const findRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const destinations = useMemo(() => allAdminDestinations(), []);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter((d) => `${d.label} ${d.blurb} ${d.section} ${d.keywords}`.toLowerCase().includes(q));
  }, [destinations, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setFindOpen(true);
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (findRef.current && !findRef.current.contains(e.target as Node)) setFindOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // The login screen is its own thing — no nav, nothing to navigate to.
  // On the admin hostname the bare path is the screen, so the path the browser
  // reports and the paths written in lib/admin-nav.ts are not the same string.
  // Everything that compares the two uses the canonical form; everything that
  // WRITES a link uses adminHref, so the links read the way the hostname does.
  const here = toAdminPath(pathname);
  const to = (href: string) => adminHref(href, pathname);

  if (here === "/admin/login") return <>{children}</>;

  const section = activeSection(here);

  const navLinks = (
    <nav aria-label="Admin sections" className="space-y-1">
      {ADMIN_SECTIONS.map((s) => {
        const current = s.href === section.href;
        return (
          <div key={s.href}>
            <Link
              href={to(s.href)}
              onClick={() => setNavOpen(false)}
              aria-current={current ? "page" : undefined}
              className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition ${
                current ? "bg-[var(--navy)] text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
              }`}
            >
              <span aria-hidden="true" className={current ? "text-[var(--gold-light)]" : "text-[var(--gold)]"}>
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className={`block text-xs ${current ? "text-stone-200" : "text-stone-500"}`}>{s.blurb}</span>
              </span>
            </Link>

            {current && s.children && s.children.length > 1 && (
              <ul className="mb-2 ml-6 mt-1 space-y-0.5 border-l border-[var(--gold-light)] pl-3">
                {s.children.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={to(c.href)}
                      onClick={() => setNavOpen(false)}
                      aria-current={here === c.href ? "page" : undefined}
                      className={`block rounded px-2 py-1.5 text-sm transition ${
                        here === c.href
                          ? "font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
                          : "text-stone-600 hover:text-[var(--navy)]"
                      }`}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    // wg-admin scopes the control-sizing rule in globals.css. The admin is
    // dozens of screens built at different times; sizing them one by one is
    // how three of them end up at 42px again next month.
    <div className="wg-admin min-h-screen bg-[var(--cream)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:border focus:border-[var(--navy)] focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to the page
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--gold-light)] bg-[#fcfaf6]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            className="min-h-11 rounded-md border border-[var(--gold-light)] px-3 text-sm text-[var(--navy)] lg:hidden"
          >
            {navOpen ? "Close" : "Menu"}
          </button>

          <Link href={to("/admin")} className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--navy)]">
            White Glove
          </Link>
          <span aria-hidden="true" className="hidden text-[var(--gold-light)] sm:inline">
            /
          </span>
          <span className="hidden text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)] sm:inline">
            {section.label}
          </span>

          <div ref={findRef} className="relative ml-auto w-40 sm:w-72">
            <input
              ref={inputRef}
              type="text"
              value={query}
              aria-label="Find a screen"
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setFindOpen(true);
              }}
              onFocus={() => setFindOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, Math.min(matches.length - 1, e.key === "ArrowDown" ? i + 1 : i - 1)));
                } else if (e.key === "Enter" && matches[active]) {
                  window.location.href = to(matches[active].href);
                } else if (e.key === "Escape") {
                  setFindOpen(false);
                }
              }}
              placeholder="Go to…"
              className="w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
            />
            {findOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_18px_40px_rgba(23,45,82,.18)]">
                {matches.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-stone-600">Nothing here matches that.</p>
                ) : (
                  <ul className="max-h-80 overflow-auto">
                    {matches.map((d, i) => (
                      <li key={d.href + d.label}>
                        <Link
                          href={to(d.href)}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => setFindOpen(false)}
                          className={`block px-3 py-2 ${i === active ? "bg-[var(--cream-deep)]" : ""}`}
                        >
                          <span className="block text-sm font-semibold text-[var(--navy)]">{d.label}</span>
                          <span className="block text-xs text-stone-500">
                            {d.section} · {d.blurb}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <a
            href={process.env.NEXT_PUBLIC_SITE_URL || "/"}
            className="hidden text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4 sm:inline"
          >
            View site
          </a>
        </div>
      </header>

      {/* Where you are, where you have been, and the thing you probably
          came to add. Under the header so it is on every screen without
          each screen having to remember to draw it. */}
      <AdminTrail />

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6">
        <aside
          id="admin-nav"
          className={`${navOpen ? "block" : "hidden"} w-full shrink-0 lg:block lg:w-64`}
        >
          {navLinks}
        </aside>

        <main id="admin-main" className={`min-w-0 flex-1 ${navOpen ? "hidden lg:block" : "block"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
