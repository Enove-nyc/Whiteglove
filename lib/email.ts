const RESEND_API_URL = "https://api.resend.com/emails";

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "White Glove Itineraries <onboarding@resend.dev>";
  return apiKey ? { apiKey, from } : null;
}

// Where notifications are delivered. Edit/suggestion submissions go to the
// "edits" inbox; contact-form messages go to the "contacts" inbox. Both can be
// overridden by env vars without a code change.
function editsInbox() {
  return process.env.OWNER_NOTIFICATION_EMAIL?.trim() || "edits@whitegloveitineraries.com";
}

function contactInbox() {
  return process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || "contact@whitegloveitineraries.com";
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

/**
 * Emails the owner whenever a visitor submits something (edit suggestion,
 * business listing, new-entry request). Returns true if the email was
 * accepted by Resend. Never throws.
 */
export async function sendSubmissionNotification(sub: SubmissionNotification): Promise<boolean> {
  const config = resendConfig();
  if (!config) {
    console.error("RESEND_API_KEY is not set - submission notification not sent.");
    return false;
  }
  const rows: Array<[string, string | undefined]> = [
    ["Type", sub.kind],
    ["About", sub.title],
    ["Page / target", sub.targetId ? `${sub.targetType ?? ""} — ${sub.targetId}` : sub.targetType],
    ["From", `${sub.name} <${sub.email}>`],
    ["Issue / request", sub.issue],
    ["Current info", sub.currentInfo],
    ["Suggested info", sub.suggestedInfo],
    ["Source", sub.source],
  ];
  const visible = rows.filter(([, v]) => v && String(v).trim());
  const html =
    `<h2 style="font-family:Georgia,serif;color:#1e2a44;">New ${escapeHtml(sub.kind)} on White Glove</h2>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">` +
    visible
      .map(
        ([k, v]) =>
          `<tr><td style="vertical-align:top;color:#8a7a52;font-weight:bold;white-space:nowrap;">${escapeHtml(k)}</td>` +
          `<td style="vertical-align:top;color:#333;">${escapeHtml(String(v)).replace(/\n/g, "<br>")}</td></tr>`,
      )
      .join("") +
    `</table><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;">Reply directly to this email to respond to ${escapeHtml(sub.name)}.</p>`;
  const text = visible.map(([k, v]) => `${k}: ${v}`).join("\n");
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: editsInbox(),
        reply_to: sub.email,
        subject: `White Glove: new ${sub.kind}${sub.title ? ` — ${sub.title}` : ""}`,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Resend submission-notification failed:", response.status, errorBody);
    }
    return response.ok;
  } catch (error) {
    console.error("Resend submission-notification threw:", error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  const config = resendConfig();
  if (!config) {
    console.error("RESEND_API_KEY is not set - verification email not sent.");
    return false;
  }
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: email,
        subject: "Your White Glove verification code",
        html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 30 minutes.</p>`,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Resend send failed:", response.status, errorBody);
    }
    return response.ok;
  } catch (error) {
    console.error("Resend send threw:", error);
    return false;
  }
}

export type ContactMessage = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

/** Delivers a public contact-form message to the contacts inbox. Never throws. */
export async function sendContactMessage(msg: ContactMessage): Promise<boolean> {
  const config = resendConfig();
  if (!config) {
    console.error("RESEND_API_KEY is not set - contact message not sent.");
    return false;
  }
  const rows: Array<[string, string | undefined]> = [
    ["From", `${msg.name} <${msg.email}>`],
    ["Phone", msg.phone],
    ["Subject", msg.subject],
    ["Message", msg.message],
  ];
  const visible = rows.filter(([, v]) => v && String(v).trim());
  const html =
    `<h2 style="font-family:Georgia,serif;color:#1e2a44;">New message from the White Glove contact form</h2>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">` +
    visible
      .map(
        ([k, v]) =>
          `<tr><td style="vertical-align:top;color:#8a7a52;font-weight:bold;white-space:nowrap;">${escapeHtml(k)}</td>` +
          `<td style="vertical-align:top;color:#333;">${escapeHtml(String(v)).replace(/\n/g, "<br>")}</td></tr>`,
      )
      .join("") +
    `</table><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;">Reply directly to this email to respond to ${escapeHtml(msg.name)}.</p>`;
  const text = visible.map(([k, v]) => `${k}: ${v}`).join("\n");
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: contactInbox(),
        reply_to: msg.email,
        subject: `White Glove contact${msg.subject ? `: ${msg.subject}` : " form message"}`,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Resend contact message failed:", response.status, errorBody);
    }
    return response.ok;
  } catch (error) {
    console.error("Resend contact message threw:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const config = resendConfig();
  if (!config) {
    console.error("RESEND_API_KEY is not set - password reset email not sent.");
    return false;
  }
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: email,
        subject: "Reset your White Glove password",
        html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Resend send failed:", response.status, errorBody);
    }
    return response.ok;
  } catch (error) {
    console.error("Resend send threw:", error);
    return false;
  }
}