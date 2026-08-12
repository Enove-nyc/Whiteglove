"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { adminHref } from "@/lib/admin-nav";

/**
 * An admin link that matches the hostname you are on.
 *
 * On the admin hostname the bar reads `/imports`, not `/admin/imports`. Hardcoded
 * `/admin/…` hrefs still work there, but they look like a different place and
 * are the reason a screen can seem reachable only by typing the bare path.
 */
type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export default function AdminNavLink({ href, ...props }: Props) {
  const pathname = usePathname();
  return <Link href={adminHref(href, pathname)} {...props} />;
}
