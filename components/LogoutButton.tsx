"use client";

import { useRouter } from "next/navigation";
import { forgetOfflineDocuments } from "@/lib/offline-documents";
import { forgetSignedIn } from "@/lib/use-signed-in";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    // Any boarding pass saved onto this device goes with the session.
    await forgetOfflineDocuments();
    // The route buttons cache the answer for the life of the page.
    forgetSignedIn();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
    >
      Sign out
    </button>
  );
}
