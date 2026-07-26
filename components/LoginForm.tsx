"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signup" | "login" | "verify" | "forgot" | "reset">("signup");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/account/me")
      .then((response) => response.json())
      .then((data) => {
        if (active && data?.account?.email) router.replace("/account");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  async function continueToAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (mode === "forgot") {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setSaving(false);
      if (!response.ok) {
        setMessage(data?.error || "Please try again.");
        return;
      }
      setMode("reset");
      setMessage("Check your email for the reset code, then enter it below with a new password.");
      return;
    }

    if (mode === "reset") {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password: newPassword }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setSaving(false);
      if (!response.ok) {
        setMessage(data?.error || "Please try again.");
        return;
      }
      s