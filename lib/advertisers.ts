/**
 * A business that pays for attention on this site.
 *
 * WHY THIS IS AN ENTITY RATHER THAN THREE FIELDS ON AN AD. An advertisement
 * used to carry a name, a phone and an email and nothing that joined two ads
 * by the same business. There was no way to look at everything one advertiser
 * was running, no way to send them a report, and no way to renew without
 * opening each creative. The three fields stay on the promotion as a copy for
 * the owner's eye; this record is the one that outlives a single banner.
 *
 * NOTHING HERE IS SHOWN TO A VISITOR. The public site sees a labelled
 * placement. The report page is reached by a token, not by this id.
 */

export type Advertiser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  /** Owner's notes. Never public. */
  notes: string;
  /** Capability URL for /advertise/report/[token]. Regenerated only on purpose. */
  reportToken: string;
  createdAt: string;
  updatedAt: string;
};

export function blankAdvertiser(now = new Date().toISOString()): Advertiser {
  return {
    id: "",
    name: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    reportToken: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeAdvertiser(row: Partial<Advertiser>, now = new Date().toISOString()): Advertiser {
  const createdAt = row.createdAt || now;
  return {
    id: (row.id ?? "").trim(),
    name: (row.name ?? "").trim(),
    email: (row.email ?? "").trim().toLowerCase(),
    phone: (row.phone ?? "").trim(),
    website: (row.website ?? "").trim(),
    notes: (row.notes ?? "").trim(),
    reportToken: (row.reportToken ?? "").trim(),
    createdAt,
    updatedAt: now,
  };
}

/** Enough to keep a record: a name, or an email we can write back to. */
export function advertiserIsHoldable(row: Pick<Advertiser, "name" | "email">): boolean {
  return Boolean(row.name.trim() || row.email.trim());
}
