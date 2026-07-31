"use client";

import { useState } from "react";
import DirectoryListingForm from "@/components/DirectoryListingForm";

/**
 * "List my business" — now the same boxes the owner has in the admin.
 *
 * It used to collect five things, join them into a paragraph and post the
 * paragraph, so accepting one meant reading the prose and retyping it. The
 * form itself is DirectoryListingForm; this is the panel it opens in.
 */
export default function ListBusinessForm() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Are you one of these businesses?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        Send us your details and we will look at them. Nothing goes on the site until somebody has.
      </p>
      {open ? (
        <div className="mt-5">
          <DirectoryListingForm mode="new" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          Add your business
        </button>
      )}
    </div>
  );
}
