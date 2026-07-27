const RESEND_API_URL = "https://api.resend.com/emails";

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "White Glove Itineraries <onboarding@resend.dev>";
  return apiKey ? { apiKey, from } : null;
}

// Where owner notifications (form submissions, edit suggestions) are delivered.
// Defaults to the owner's Google inbox so it works before the Spacemail
// mailboxes exist; set OWNER_NOTIFICATION_EMAIL to edits@whitegloveitineraries.com
// once that mailbox is live.
function ownerInbox() {
  return process.env.OWNER_NOTIFICATION_EMAIL?.trim() || "whitegloveitineraries@gmail.com";
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
        to: ownerInbox(),
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