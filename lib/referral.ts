/**
 * Customer referral programme — prepared, disabled by default.
 *
 * DO NOT invent reward amounts. DO NOT show a public launch until the owner
 * turns the programme on AND finalises reward rules. Until then every public
 * surface says the programme is not open.
 */

export type ReferralSettings = {
  /** Master switch. False until the owner explicitly enables it. */
  enabled: boolean;
  /**
   * Human-readable rules shown on the status page.
   * Empty until the owner writes them — never invent a dollar figure here.
   */
  rulesText: string;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  enabled: false,
  rulesText: "",
};

export type ReferralCode = {
  /** Short public code, uppercase. */
  code: string;
  ownerEmail: string;
  createdAt: string;
};

export type ReferralAttribution = {
  code: string;
  /** Person who signed up (email/phone identity key). */
  referred: string;
  at: string;
  /** Blocked reasons stay on the record for fraud review. */
  status: "pending" | "qualified" | "blocked";
  blockReason?: string;
};

export function normalizeReferralCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4 || code.length > 12) return null;
  return code;
}

/** Self-referral and empty codes are always blocked. */
export function attributionProblem(input: {
  codeOwner: string;
  referred: string;
  same?: (a: string, b: string) => boolean;
}): string | null {
  const same = input.same ?? ((a, b) => a.trim().toLowerCase() === b.trim().toLowerCase());
  if (!input.codeOwner.trim() || !input.referred.trim()) return "Missing referral details.";
  if (same(input.codeOwner, input.referred)) return "You cannot use your own referral link.";
  return null;
}

export function publicReferralStatus(settings: ReferralSettings): {
  open: boolean;
  headline: string;
  body: string;
} {
  if (!settings.enabled) {
    return {
      open: false,
      headline: "Invitations are not open",
      body: "There is no referral programme running at the moment.",
    };
  }
  return {
    open: true,
    headline: "Invite a friend",
    body:
      settings.rulesText.trim() || "Share your link with a friend.",
  };
}
