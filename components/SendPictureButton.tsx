"use client";

import { useState, type FormEvent } from "react";
import { SUBMISSION_MAX_BYTES, type PictureTarget } from "@/lib/photo-submissions";

/**
 * Send us a picture.
 *
 * Says what happens next, in the first line, because the honest answer is not
 * "it will appear": somebody looks at it first, and it may not go up at all. A
 * form that implies otherwise is a form that disappoints the person who took
 * the trouble.
 *
 * Two questions that look like one and are not. The CREDIT is whose photograph
 * it is. The PERMISSION is whether this person may hand it over. Somebody can
 * honestly name a photographer and still have no right to send the picture,
 * which is most of how a photograph ends up published without permission.
 */

const field =
  "mt-1 w-full rounded border border-[var(--gold-light)] bg-white px-2.5 py-1.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "block text-[11px] font-medium text-stone-500";

export default function SendPictureButton({ targets, heading }: {
  /** What it could be a picture of. One entry means no picker is shown. */
  targets: PictureTarget[];
  heading?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [form, setForm] = useState({
    ref: targets[0]?.ref ?? "",
    name: "",
    email: "",
    credit: "",
    caption: "",
    note: "",
    permission: false,
  });

  if (!targets.length) return null;
  const chosen = targets.find((t) => t.ref === form.ref) ?? targets[0];

  async function pick(file: File) {
    setMessage("");
    if (file.size > SUBMISSION_MAX_BYTES) {
      setDataUrl("");
      setFileName("");
      setMessage(`That picture is too large (max ${Math.round(SUBMISSION_MAX_BYTES / 1024)} KB). A smaller one is fine.`);
      return;
    }
    const read = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (!read) {
      setMessage("Could not read that file.");
      return;
    }
    setDataUrl(read);
    setFileName(file.name);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ownerKind: chosen.kind, ownerRef: chosen.ref, dataUrl }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error || "Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setMessage("Please check the connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center text-xs text-stone-400 underline decoration-[var(--gold-light)] decoration-1 underline-offset-2 transition hover:text-[var(--navy)]"
      >
        {open ? "Close" : (heading ?? "Have a picture of this place? Send it in")}
      </button>

      {open && (
        sent ? (
          <p className="mt-3 max-w-lg rounded border border-[var(--gold-light)] bg-[#fcfaf6] p-3 text-sm leading-6 text-stone-700">
            Thank you. It has been sent to White Glove, who will look at it before deciding whether it goes on the
            site. If it does, your credit goes under it.
          </p>
        ) : (
          <form className="mt-3 grid max-w-lg gap-3 rounded border border-[var(--gold-light)] bg-[#fcfaf6] p-3" onSubmit={submit}>
            <p className="text-xs leading-5 text-stone-600">
              Nothing goes on the site straight away — White Glove looks at every picture first, and decides. If it
              goes up, the credit you give below goes under it.
            </p>

            {targets.length > 1 && (
              <label className={label}>What is it a picture of?
                <select
                  value={form.ref}
                  onChange={(event) => setForm((current) => ({ ...current, ref: event.target.value }))}
                  className={field}
                >
                  {targets.map((target) => (
                    <option key={target.ref} value={target.ref}>{target.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className={label}>The picture
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void pick(file);
                }}
                className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:min-h-9 file:cursor-pointer file:border file:border-[var(--navy)] file:bg-[var(--navy)] file:px-3 file:text-[11px] file:font-bold file:uppercase file:tracking-[0.1em] file:text-white"
              />
              {fileName && <span className="mt-1 block text-xs text-stone-500">{fileName}</span>}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Your name
                <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required className={field} />
              </label>
              <label className={label}>Your email
                <input value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} type="email" required className={field} />
              </label>
            </div>

            <label className={label}>Who took the picture?
              <input
                value={form.credit}
                onChange={(e) => setForm((c) => ({ ...c, credit: e.target.value }))}
                required
                placeholder="Your name, or whoever it belongs to"
                className={field}
              />
            </label>

            <label className={label}>What does it show? (optional)
              <input value={form.caption} onChange={(e) => setForm((c) => ({ ...c, caption: e.target.value }))} className={field} placeholder="The gate from the road" />
            </label>

            <label className={label}>Anything else we should know? (optional)
              <textarea value={form.note} onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))} rows={2} className={field} />
            </label>

            {/* Separate from the credit on purpose — see the note at the top. */}
            <label className="flex items-start gap-2 text-xs leading-5 text-stone-600">
              <input
                type="checkbox"
                checked={form.permission}
                onChange={(e) => setForm((c) => ({ ...c, permission: e.target.checked }))}
                required
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              I took this picture, or I have permission to share it.
            </label>

            {message && <p className="text-xs font-semibold text-red-700">{message}</p>}
            <button
              disabled={sending}
              type="submit"
              className="justify-self-start rounded bg-[var(--navy)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--gold)] disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send the picture"}
            </button>
          </form>
        )
      )}
    </div>
  );
}
