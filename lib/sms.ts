// Sending a text.
//
// Used for one thing: the code that proves somebody owns the number they
// signed up with. It goes through Twilio's REST API with plain fetch — no
// package to install, no build step, and nothing new to keep updated.
//
// With no Twilio credentials set, nothing is sent and smsConfigured() is false,
// so the sign-up form does not offer signing up by phone at all. That is
// deliberate: offering it and then failing silently would leave somebody
// waiting for a text that was never going to arrive.
//
// Outcomes are written to the same delivery log the emails use, so the admin
// panel shows texts and emails together — a code that never arrived is the
// same problem whichever pipe it went down.

import { recordEmailAttempt } from "@/lib/email-log";
import { formatPhone } from "@/lib/identity";

export type SmsResult = { ok: boolean; status?: number; id?: string; error?: string };

function twilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  // A messaging service or a from-number: Twilio needs one or the other.
  if (!sid || !token || (!from && !service)) return null;
  return { sid, token, from, service };
}

/** Can this deployment send a text at all? */
export function smsConfigured(): boolean {
  return twilioConfig() !== null;
}

/** What is set and what is missing, for the admin connections screen. */
export function smsConfigStatus() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  return {
    configured: smsConfigured(),
    accountSet: Boolean(sid),
    tokenSet: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
    // Never the number itself if it were secret — it is not, it is the number
    // texts come from, and the owner needs to see which one is in use.
    sender: service ? `messaging service ${service.slice(0, 6)}…` : from ? formatPhone(from) : null,
  };
}

/** Send one message. Never throws; reports exactly what Twilio said. */
export async function sendSms(to: string, body: string, kind = "sms"): Promise<SmsResult> {
  const config = twilioConfig();
  if (!config) {
    const error = "No text service is connected, so no code can be sent by text.";
    await recordEmailAttempt({ at: new Date().toISOString(), kind, to, ok: false, error });
    return { ok: false, error };
  }

  const form = new URLSearchParams({ To: to, Body: body });
  if (config.service) form.set("MessagingServiceSid", config.service);
  else if (config.from) form.set("From", config.from);

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.sid}:${config.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const text = await response.text().catch(() => "");

    if (!response.ok) {
      // Twilio answers with a JSON body carrying a readable message; fall back
      // to the raw text when it does not.
      let message = text;
      try {
        const parsed = JSON.parse(text) as { message?: string; code?: number };
        if (parsed.message) message = parsed.code ? `${parsed.message} (Twilio ${parsed.code})` : parsed.message;
      } catch {
        /* keep the raw body */
      }
      const error = message || `Twilio returned HTTP ${response.status}.`;
      console.error("[sms] send failed:", response.status, error);
      await recordEmailAttempt({ at: new Date().toISOString(), kind, to, ok: false, status: response.status, error });
      return { ok: false, status: response.status, error };
    }

    let id: string | undefined;
    try {
      id = (JSON.parse(text) as { sid?: string }).sid;
    } catch {
      /* body isn't JSON — fine */
    }
    await recordEmailAttempt({ at: new Date().toISOString(), kind, to, ok: true, status: response.status });
    return { ok: true, status: response.status, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sms] send threw:", error);
    await recordEmailAttempt({ at: new Date().toISOString(), kind, to, ok: false, error: message });
    return { ok: false, error: message };
  }
}

/** The verification code, by text. */
export async function sendVerificationSms(to: string, code: string): Promise<boolean> {
  const result = await sendSms(
    to,
    `${code} is your White Glove Kosher Travel verification code. It expires in 30 minutes.`,
    "verification code",
  );
  return result.ok;
}

/** The password-reset code, by text. */
export async function sendPasswordResetSms(to: string, code: string): Promise<boolean> {
  const result = await sendSms(
    to,
    `${code} is your White Glove Kosher Travel password reset code. It expires in 30 minutes. If you did not ask for it, ignore this message.`,
    "password reset",
  );
  return result.ok;
}
