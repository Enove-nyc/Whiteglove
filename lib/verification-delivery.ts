// Getting a code to the person who asked for it.
//
// An account is named by an email or by a phone number, and the code has to go
// wherever that is. Every route that needs to send one asks here instead of
// choosing, so there is exactly one place that knows the rule and no route can
// get it wrong.

import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { describeIdentity, isPhoneIdentity } from "@/lib/identity";
import { sendPasswordResetSms, sendVerificationSms, smsConfigured } from "@/lib/sms";
import type { SiteBrand } from "@/lib/site-brand-core";

export type DeliveryOutcome = {
  ok: boolean;
  /** "text message" or "email" — for telling the person where to look. */
  via: "text message" | "email";
  /** The address or number, spelled the way a person reads it. */
  to: string;
  error?: string;
};

async function deliver(
  identity: string,
  code: string,
  siteBrand: SiteBrand,
  byEmail: (to: string, code: string) => Promise<boolean>,
  byText: (to: string, code: string, siteBrand: SiteBrand) => Promise<boolean>,
): Promise<DeliveryOutcome> {
  const to = describeIdentity(identity);
  if (isPhoneIdentity(identity)) {
    if (!smsConfigured()) {
      // Should not be reachable — signing up by phone is not offered without a
      // text service — but an account made while one was connected outlives it.
      return { ok: false, via: "text message", to, error: "No text service is connected, so the code cannot be sent." };
    }
    const ok = await byText(identity, code, siteBrand);
    return { ok, via: "text message", to, error: ok ? undefined : "The text could not be sent." };
  }
  const ok = await byEmail(identity, code);
  return { ok, via: "email", to, error: ok ? undefined : "The email could not be sent." };
}

export function verificationCodeTo(identity: string, code: string, siteBrand: SiteBrand) {
  return deliver(identity, code, siteBrand, sendVerificationEmail, sendVerificationSms);
}

export function resetCodeTo(identity: string, code: string, siteBrand: SiteBrand) {
  return deliver(identity, code, siteBrand, sendPasswordResetEmail, sendPasswordResetSms);
}
