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