const RESEND_API_URL = "https://api.resend.com/emails";

// Resend's shared sandbox sender. It can ONLY deliver to the email address that
// owns the Resend account — anything else is rejected. A real domain sender
// (e.g. no-reply@whitegloveitineraries.com, once the domain is verified in
// Resend) is required for mail to reach the edits@/contact@ inboxes.
const TEST_SENDER = "White Glove Itineraries <onboarding@resend.dev>";

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || TEST_SENDER;
  return apiKey ? { apiKey, from } : null;
}

// Where notifications are delivered. Edit/suggestion submissions go to the
// "edits" inbox; contact-form messages go to the "contact" inbox. Both can be
// overridden by env vars without a code change.
function editsInbox() {
  return process.env.OWNER_NOTIFICATION_EMAIL?.trim() || "edits@whitegloveitineraries.com";
}

function contactInbox() {
  return process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || "contact@whitegloveitineraries.com";
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- Delivery plumbing -------------------------------------------------

export type SendResult = {
  ok: boolean;
  status?: number;
  id?: string;
  error?: string;
  /** True when the failure is Resend refusing the sandbox sender. */
  sandboxRestricted?: boolean;
};

/** The last delivery failure, so the admin panel can show what actually broke. */
let lastFailure: (SendResult & { at: string; to: string }) | null = null;
export function lastEmailFailure() {
  return lastFailure;
}

/** POST one email to Resend and report exactly what happened. Never throws. */
async function postResend(payload: Record<string, unknown>, to: string): Promise<SendResult> {
  const config = resendConfig();
  if (!config) {
    const result: SendResult = { ok: false, error: "RESEND_API_KEY is not set on the deployment, so no email can be sent." };
    lastFailure = { ...result, at: new Date().toISOString(), to };
    console.error("[email]", result.error);
    return result;
  }
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, ...payload }),
    });
    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      // Resend rejects the sandbox sender for any recipient other than the
      // account owner — the most common reason owner mail never arrives.
      const sandboxRestricted =
        config.from === TEST_SENDER && /own email address|testing emails|not verified|verify a domain/i.test(bodyText);
      const result: SendResult = {
        ok: false,
        status: response.status,
        error: bodyText || `Resend returned HTTP ${response.status}.`,
        sandboxRestricted,
      };
      lastFailure = { ...result, at: new Date().toISOString(), to };
      console.error("[email] send failed:", response.status, bodyText);
      return result;
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(bodyText) as { id?: string }).id;
    } catch {
      /* body isn't JSON — fine */
    }
    return { ok: true, status: response.status, id };
  } catch (error) {
    const result: SendResult = { ok: false, error: error instanceof Error ? error.message : String(error) };
    lastFailure = { ...result, at: new Date().toISOString(), to };
    console.error("[email] send threw:", error);
    return result;
  }
}

/** Current delivery configuration, for the admin diagnostic panel. */
export function emailConfigStatus() {
  const apiKeySet = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL?.trim() || TEST_SENDER;
  return {
    apiKeySet,
    from,
    usingTestSender: from === TEST_SENDER,
    editsInbox: editsInbox(),
    contactInbox: contactInbox(),
    editsInboxFromEnv: Boolean(process.env.OWNER_NOTIFICATION_EMAIL?.trim()),
    contactInboxFromEnv: Boolean(process.env.CONTACT_NOTIFICATION_EMAIL?.trim()),
    lastFailure,
  };
}

/** Send a test message to one of the owner inboxes and report the outcome. */
export async function sendTestEmail(which: "edits" | "contact"): Promise<SendResult & { to: string }> {
  const to = which === "contact" ? contactInbox() : editsInbox();
  const when = new Date().toISOString();
  const result = await postResend(
    {
      to,
      subject: `White Glove test email (${which})`,
      html: `<p>This is a test from your White Glove admin dashboard.</p><p>If you are reading this, mail to <strong>${escapeHtml(to)}</strong> is working.</p><p style="color:#999;font-size:12px;">Sent ${escapeHtml(when)}</p>`,
      text: `Test from your White Glove admin dashboard. If you are reading this, mail to ${to} is working. Sent ${when}`,
    },
    to,
  );
  return { ...result, to };
}

// ---- Messages ----------------------------------------------------------

export type SubmissionNotification = {
  kind: string; // e.g. "Edit suggestion", "Business listing"
  targetType?: string;
  targetId?: string;
  title?: string;
  name: string;
  email: string;
  issue?: string;
  currentInfo?: string;
  suggestedInfo?: string;
  source?: string;
};

function table(rows: Array<[string, string | undefined]>) {
  const visible = rows.filter(([, v]) => v && String(v).trim());
  const html =
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">` +
    visible
      .map(
        ([k, v]) =>
          `<tr><td style="vertical-align:top;color:#8a7a52;font-weight:bold;white-space:nowrap;">${escapeHtml(k)}</td>` +
          `<td style="vertical-align:top;color:#333;">${escapeHtml(String(v)).replace(/\n/g, "<br>")}</td></tr>`,
      )
      .join("") +
    `</table>`;
  return { html, text: visible.map(([k, v]) => `${k}: ${v}`).join("\n") };
}

/**
 * Emails the owner whenever a visitor submits something (edit suggestion,
 * business listing, new-entry request). Returns true if Resend accepted it.
 */
export async function sendSubmissionNotification(sub: SubmissionNotification): Promise<boolean> {
  const { html, text } = table([
    ["Type", sub.kind],
    ["About", sub.title],
    ["Page / target", sub.targetId ? `${sub.targetType ?? ""} — ${sub.targetId}` : sub.targetType],
    ["From", `${sub.name} <${sub.email}>`],
    ["Issue / request", sub.issue],
    ["Current info", sub.currentInfo],
    ["Suggested info", sub.suggestedInfo],
    ["Source", sub.source],
  ]);
  const to = editsInbox();
  const result = await postResend(
    {
      to,
      reply_to: sub.email,
      subject: `White Glove: new ${sub.kind}${sub.title ? ` — ${sub.title}` : ""}`,
      html: `<h2 style="font-family:Georgia,serif;color:#1e2a44;">New ${escapeHtml(sub.kind)} on White Glove</h2>${html}<p style="font-family:Arial,sans-serif;font-size:12px;color:#999;">Reply directly to this email to respond to ${escapeHtml(sub.name)}.</p>`,
      text,
    },
    to,
  );
  return result.ok;
}

export async function sendVerificationEmail(email: string, code: string) {
  const result = await postResend(
    {
      to: email,
      subject: "Your White Glove verification code",
      html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px;">${escapeHtml(code)}</h2><p>This code expires in 30 minutes.</p>`,
    },
    email,
  );
  return result.ok;
}

export type ContactMessage = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

/** Delivers a public contact-form message to the contact inbox. Never throws. */
export async function sendContactMessage(msg: ContactMessage): Promise<boolean> {
  const { html, text } = table([
    ["From", `${msg.name} <${msg.email}>`],
    ["Phone", msg.phone],
    ["Subject", msg.subject],
    ["Message", msg.message],
  ]);
  const to = contactInbox();
  const result = await postResend(
    {
      to,
      reply_to: msg.email,
      subject: `White Glove contact${msg.subject ? `: ${msg.subject}` : " form message"}`,
      html: `<h2 style="font-family:Georgia,serif;color:#1e2a44;">New message from the White Glove contact form</h2>${html}<p style="font-family:Arial,sans-serif;font-size:12px;color:#999;">Reply directly to this email to respond to ${escapeHtml(msg.name)}.</p>`,
      text,
    },
    to,
  );
  return result.ok;
}

/**
 * Emails a person a link to an itinerary that was shared with them. Never
 * throws; returns true when Resend accepts it.
 */
export async function sendItineraryShareEmail(to: string, opts: { fromName: string; url: string; title: string }): Promise<boolean> {
  const who = escapeHtml(opts.fromName || "A fellow traveler");
  const title = escapeHtml(opts.title || "their trip");
  const url = escapeHtml(opts.url);
  const result = await postResend(
    {
      to,
      subject: `${opts.fromName || "A traveler"} shared "${opts.title}" with you`,
      html:
        `<h2 style="font-family:Georgia,serif;color:#1e2a44;">${who} shared a trip with you</h2>` +
        `<p style="font-family:Arial,sans-serif;font-size:14px;color:#333;">You've been added to <strong>${title}</strong> on White Glove Itineraries.</p>` +
        `<p style="font-family:Arial,sans-serif;font-size:14px;"><a href="${url}" style="display:inline-block;background:#1e2a44;color:#fff;text-decoration:none;padding:12px 20px;font-weight:bold;">View the itinerary →</a></p>` +
        `<p style="font-family:Arial,sans-serif;font-size:12px;color:#999;">Or open this link: ${url}</p>`,
      text: `${opts.fromName || "A fellow traveler"} shared "${opts.title}" with you on White Glove Itineraries.\n\nView it here: ${opts.url}`,
    },
    to,
  );
  return result.ok;
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const result = await postResend(
    {
      to: email,
      subject: "Reset your White Glove password",
      html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px;">${escapeHtml(code)}</h2><p>This code expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
    },
    email,
  );
  return result.ok;
}
