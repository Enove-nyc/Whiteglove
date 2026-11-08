"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

function installed() {
  if (typeof window === "undefined" || window.location.hostname.includes("whitegloveitineraries")) return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean((cap && (cap.isNativePlatform?.() ?? true)) || window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone || document.referrer.startsWith("android-app://"));
}
function subscribe(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function KosherSearchShell() {
  const pathname = usePathname();
  const inApp = useSyncExternalStore(subscribe, installed, () => false);
  if (!inApp && !(pathname === "/travel" || pathname.startsWith("/travel/"))) return null;
  const websiteOnly = /^\/(?:itinerary|book|plan|advisor|app|i|t)(?:\/|$)/.test(pathname);
  const links = [["/travel", "Search"], ["/map", "Map"], ["/travel/assistant", "AI companion"], ["/account", "You"]];
  return <>
    <style>{`
      .wg-web-chrome, nav[aria-label="Main"], nav[aria-label="Quick links"], footer#contact, [data-assistant="launcher"] { display:none!important; }
      body { padding-top:calc(64px + env(safe-area-inset-top))!important; padding-bottom:calc(72px + env(safe-area-inset-bottom))!important; }
      .wg-kosher-app-header { padding-top:env(safe-area-inset-top); }
      .wg-kosher-app-tabs { padding-bottom:env(safe-area-inset-bottom); }
    `}</style>
    <header className="wg-kosher-app-header fixed inset-x-0 top-0 z-[90] border-b border-stone-200 bg-[#FAF8F3] text-[#102F35]">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-5"><Link href="/travel" className="flex min-h-11 items-center text-sm font-semibold">White Glove Kosher Travel</Link>{pathname !== "/travel" ? <Link href="/travel" className="inline-flex min-h-11 items-center text-sm underline">Search</Link> : null}</div>
    </header>
    {websiteOnly ? <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#FAF8F3] px-5 pb-24 pt-20"><section className="max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-[#102F35]"><h1 className="text-2xl font-semibold">Continue on the website</h1><p className="mt-3 text-sm leading-6 text-stone-600">Build itineraries and search booking options on the website. This app keeps travel information close at hand.</p><a href={typeof window === "undefined" ? "https://www.whiteglovekoshertravel.com" : window.location.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#102F35] px-5 text-sm font-semibold text-white">Open the website</a><Link href="/travel" className="mt-3 flex min-h-11 items-center text-sm underline">Back to search</Link></section></div> : null}
    <nav aria-label="Travel app" className="wg-kosher-app-tabs fixed inset-x-0 bottom-0 z-[90] border-t border-stone-200 bg-[#FAF8F3] text-[#102F35]"><div className="mx-auto flex max-w-3xl">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-16 flex-1 items-center justify-center px-1 text-center text-xs font-semibold ${pathname === href ? "border-t-2 border-[#C6A15B] bg-white" : "text-stone-600"}`}>{label}</Link>)}</div></nav>
  </>;
}
