import assert from "node:assert/strict";
import { test } from "node:test";
import { sendBlastEmail, sendBookingPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

test("the site uses only the Itineraries From address", async (t) => {
  const overrides = {
    RESEND_API_KEY: "test-only",
    RESEND_FROM_EMAIL: "White Glove Kosher Travel <no-reply@whiteglovekoshertravel.com>",
    RESEND_FROM_EMAIL_ITINERARIES: "Other <other@whitegloveitineraries.com>",
  };
  for (const [key, value] of Object.entries(overrides)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const sent: { from: string; reply_to?: string }[] = [];
  const deliver = t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    if (url !== "https://api.resend.com/emails") return new Response(null, { status: 404 });
    sent.push(JSON.parse(String(init.body)));
    return Response.json({ id: "mock" });
  });

  await sendVerificationEmail("guest@example.com", "123456");
  await sendBookingPasswordResetEmail("owner@example.com", "https://book.whitegloveitineraries.com/reset");
  await sendBlastEmail({
    to: "guest@example.com",
    subject: "Sample trip",
    from: "reply@example.com",
    blast: { body: "Sample update" },
    origin: "https://www.whitegloveitineraries.com",
    unsubscribeUrl: "https://www.whitegloveitineraries.com/unsubscribe",
    becauseLine: "You signed up for updates.",
  });

  assert.equal(deliver.mock.callCount() >= 3, true);
  assert.equal(sent.length, 3);
  for (const message of sent) {
    assert.equal(message.from, "White Glove Itineraries <no-reply@whitegloveitineraries.com>");
  }
  assert.equal(sent[2].reply_to, "reply@example.com");
});
