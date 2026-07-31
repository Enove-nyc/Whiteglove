"use client";

import { useState } from "react";
import DirectoryListingForm from "@/components/DirectoryListingForm";
import type { PublicProvider } from "@/lib/directory";
import type { DirectoryDraft } from "@/lib/directory-fields";

/**
 * "Something wrong here?" on a directory listing.
 *
 * Opens the same form the owner has, filled in with what is published now, so
 * somebody correcting one number changes one box and the rest arrives
 * unchanged. The review screen then shows exactly the boxes that moved.
 *
 * Built from what the page already holds rather than fetched: this is the same
 * listing the visitor is looking at, and a second round trip to re-read it
 * would only introduce a way for the two to disagree.
 */
export default function DirectoryCorrectionButton({ provider }: { provider: PublicProvider }) {
  const [open, setOpen] = useState(false);
  // Closing the panel on send would make the form simply vanish, which reads
  // as having lost the correction rather than having sent it.
  const [sent, setSent] = useState(false);

  const current: DirectoryDraft = {
    name: provider.name,
    category: provider.category,
    tagline: provider.tagline ?? undefined,
    description: provider.description ?? undefined,
    // A number the site is not publishing is not shown here either — the
    // correction form must not become a way to read one back out.
    phone: provider.phone ?? undefined,
    whatsapp: provider.whatsapp ?? undefined,
    email: provider.email ?? undefined,
    website: provider.website ?? undefined,
    basedIn: provider.basedIn ?? undefined,
    regions: provider.regions.join(", ") || undefined,
    languages: provider.languages.join(", ") || undefined,
    specialties: provider.specialties.join(", ") || undefined,
    responseTime: provider.responseTime ?? undefined,
  };

  if (sent) {
    return (
      <p className="mt-4 text-xs leading-5 text-[var(--navy)]">
        Thank you — your correction has been sent for review.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center text-xs text-stone-400 underline decoration-[var(--gold-light)] decoration-1 underline-offset-2 transition hover:text-[var(--navy)]"
      >
        {open ? "Close" : "Something wrong here? Send a correction"}
      </button>
      {open && (
        <div className="mt-3">
          <DirectoryListingForm
            mode="edit"
            targetId={provider.slug}
            targetName={provider.name}
            current={current}
            onDone={() => { setOpen(false); setSent(true); }}
          />
        </div>
      )}
    </div>
  );
}
