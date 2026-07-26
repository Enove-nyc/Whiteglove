const RESEND_API_URL = "https://api.resend.com/emails";

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "White Glove Itineraries <onboarding@resend.dev>";
  return apiKey ? { apiKey, from } : null;
}

export async function sendVerificationEmail(email: string, code: string) {
  const config = resendConfig();
  if (!config) {
    console.error("RESEND_API_KEY is not set — verification email not sent.");
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
    console.error("RESEND_API_KEY is not set — password reset email not sent.");
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
        html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 30 minutes. If you didn't request