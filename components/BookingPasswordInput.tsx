"use client";

import { useState } from "react";

export default function BookingPasswordInput({ autoComplete = "current-password", minLength }: {
  autoComplete?: "current-password" | "new-password";
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id="booking-password" name="password" type={visible ? "text" : "password"}
        autoComplete={autoComplete} minLength={minLength} maxLength={128} required
        className="w-full rounded border border-stone-400 px-3 py-2 pr-12" />
      <button type="button" onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"} aria-controls="booking-password"
        className="absolute inset-y-0 right-0 grid min-w-11 place-items-center rounded text-[var(--navy)]">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
          {visible && <path d="m4 4 16 16" />}
        </svg>
      </button>
    </div>
  );
}
