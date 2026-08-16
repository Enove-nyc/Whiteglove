"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { isCurrent } from "@/lib/navigation";
import { signInHref } from "@/lib/use-signed-in";

/**
 * The compact bottom bar for phones — Search, Route, Itinerary, Account.
 *
 * Below `sm` the header has no room for the icon row (it is `hidden sm:flex`
 * there), so this is the only way to reach them on the smallest screens.
 * Icon + a one-word label, because a hover tooltip never fires on a phone.
 * No Favorites here — that stays inside Account, per the brief.
 */

const ITEMS: Array<{ key: string; icon: IconName; label: string; href: string }> = [
  { key: "search", icon: "search", label: "Search", href: "/search" },
  { key: "route", icon: "route", label: "Route", href: "/my-route" },
  { key: "itinerary", icon: "suitcase", label: "Itinerary", href: "/itinerary" },
];

export default function MobileBottomBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const items = [...ITEMS, { key: "account", icon: "account" as IconName, label: "Account", href: signedIn ? "/account" : signInHref() }];

  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-[var(--wg-z-header)] flex border-t border-[var(--gold-light)] bg-[#fffdf9] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(23,45,82,.08)] sm:hidden"
    >
      {items.map((item) => {
        const active = isCurrent(item.href, pathname);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              active ? "text-[var(--navy)]" : "text-stone-500"
            }`}
          >
            <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-[var(--gold-ink)]" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
