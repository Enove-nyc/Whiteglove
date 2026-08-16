"use client";

import { usePathname, useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-nav";

export default function AdminSignOut() {
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.push(adminHref("/admin/login", pathname));
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
    >
      Sign out
    </button>
  );
}
