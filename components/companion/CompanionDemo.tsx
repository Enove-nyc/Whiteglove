"use client";

/**
 * Everything that only exists for the Rome showcase.
 *
 * A real trip always carries `concierge: false` (data/companion-demo.ts), so
 * none of this ever reaches a real client — but it used to live inline inside
 * CompanionApp.tsx, mixed into the same component that renders real trips.
 * That is its own risk: a scripted advisor reply, a fake "typing…" indicator
 * and a Concierge/Guide mode switch are exactly the kind of thing that is one
 * careless edit away from being wired into production by accident. Pulling
 * them out here means the demo can only ever be reached through the one flag
 * (`trip.concierge`) that already decides it, and a change to production chat
 * cannot brush up against this file at all.
 */

import { type CSSProperties, useRef, useState } from "react";
import type { CompanionAdvisorTrip, CompanionMessage } from "@/data/companion-demo";

export type DemoMode = "concierge" | "guide";
export type DemoRole = "traveler" | "advisor";

const GOLD = "#b78a4a";
const CREAM = "#f7f5f0";
const serif = "Georgia,'Times New Roman',serif";

/**
 * The scripted advisor thread — state and the one canned reply.
 *
 * Nothing here calls a server. A message you send sits for a moment, marked
 * "typing…", and then the SAME fixed line comes back every time. That is
 * fine for a showcase walking somebody through what the real thread will
 * feel like; it would be a lie told to an actual client, which is why this
 * hook is only ever constructed for the demo trip.
 */
export function useCompanionDemoChat(seed: CompanionMessage[], hasConcierge: boolean) {
  const [messages, setMessages] = useState<CompanionMessage[]>(seed);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [tmode, setTmode] = useState<DemoMode>(hasConcierge ? "concierge" : "guide");
  const [role, setRole] = useState<DemoRole>("traveler");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function send(text?: string) {
    const t = (text ?? draft).trim();
    if (!t) return;
    setMessages((m) => [...m, { from: "me", text: t }]);
    setDraft("");
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { from: "them", text: "On it — give me five minutes and I will come back with something held rather than something to check." },
      ]);
    }, 1600);
  }

  function stopTimer() {
    if (timer.current) clearTimeout(timer.current);
  }

  /** Appends a real exchange straight in — used by the weather-swap card,
   *  which already knows both sides of the conversation rather than having
   *  to type one and wait on the canned reply. */
  function pushExchange(mine: string, theirs: string) {
    setMessages((m) => [...m, { from: "me", text: mine }, { from: "them", text: theirs }]);
  }

  return { messages, draft, setDraft, typing, send, pushExchange, tmode, setTmode, role, setRole, stopTimer };
}

const DEMO_QUICK_REPLIES_ADVISOR = ["Two options, both held", "Running twenty minutes late", "Candle-lighting is 16:52"];
const DEMO_QUICK_REPLIES_TRAVELER = ["Can we move the Vatican?", "Where do we eat tonight?", "Is the guide confirmed?"];

function kicker(color: string): CSSProperties {
  return { font: `600 10.5px/1 Inter,sans-serif`, letterSpacing: ".13em", textTransform: "uppercase", color };
}

/** The scripted "Concierge" tab — a chat with nobody real on the other end. */
export function DemoConciergeChat({
  messages,
  draft,
  setDraft,
  typing,
  send,
  role,
  firstName,
}: {
  messages: CompanionMessage[];
  draft: string;
  setDraft: (v: string) => void;
  typing: boolean;
  send: (text?: string) => void;
  role: DemoRole;
  firstName: string;
}) {
  const quickReplies = role === "advisor" ? DEMO_QUICK_REPLIES_ADVISOR : DEMO_QUICK_REPLIES_TRAVELER;
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", animation: "wgIn .28s ease both" }}>
      <div style={{ flex: 1, padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ alignSelf: "center", font: "400 11px/1 ui-monospace,Menlo,monospace", color: "#a8a29e", background: "#ece8df", padding: "7px 12px", borderRadius: 14 }}>Tuesday 27 October</div>
        {messages.map((m, i) => {
          const mine = m.from === "me";
          return (
            <div key={i} style={{ maxWidth: "80%", alignSelf: mine ? "flex-end" : "flex-start", background: mine ? GOLD : "#ffffff", color: mine ? CREAM : "#26323a", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "13px 15px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(23,45,82,.08)" }}>{m.text}</div>
          );
        })}
        {typing && (
          <div style={{ alignSelf: "flex-start", background: "#ffffff", borderRadius: "14px 14px 14px 4px", padding: "14px 18px", font: "400 12px/1 ui-monospace,Menlo,monospace", color: "#78716c", animation: "wgPulse 1.2s ease-in-out infinite" }}>{(role === "advisor" ? "The Cohens are" : `${firstName} is`)} typing…</div>
        )}
      </div>
      <div style={{ flexShrink: 0, position: "sticky", bottom: 0, background: CREAM, borderTop: "1px solid rgba(38,50,58,.08)", padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
          {quickReplies.map((q, i) => (
            <button key={i} onClick={() => send(q)} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", fontSize: 12.5, padding: "9px 14px", borderRadius: 14, color: "#26323a", whiteSpace: "nowrap" }}>{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={role === "advisor" ? "Reply to the Cohens…" : `Ask ${firstName} anything…`} style={{ flex: 1, minWidth: 0, border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", borderRadius: 14, padding: "14px 17px", fontFamily: "Inter,sans-serif", fontSize: 16, color: "#26323a", outline: "none" }} />
          <button onClick={() => send()} className="wg-press" style={{ flex: "none", border: 0, cursor: "pointer", background: GOLD, color: CREAM, width: 46, height: 46, borderRadius: 14, fontSize: 17, padding: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}

/** The scripted advisor's own home screen — every showcase client at once. */
export function DemoAdvisorHome({ trips, onOpenAlert }: { trips: CompanionAdvisorTrip[]; onOpenAlert: () => void }) {
  return (
    <div style={{ padding: "18px 18px 28px", display: "flex", flexDirection: "column", gap: 14, animation: "wgIn .28s ease both" }}>
      <div style={{ padding: 20, borderRadius: 20, background: "#ece8df", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={kicker("#57534e")}>Tuesday 27 October</span>
        <div style={{ font: `400 26px/1.1 ${serif}` }}>Three trips in the air</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#57534e" }}>One needs you now. Two are running to plan.</p>
      </div>
      {trips.map((t, i) => (
        <div key={i} style={{ padding: 18, borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ font: `400 19px/1.1 ${serif}` }}>{t.family}</span>
            <span style={{ font: "600 10.5px/1 Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: t.statusFg, background: t.statusBg, padding: "6px 10px", borderRadius: 14 }}>{t.status}</span>
          </div>
          <span style={{ fontSize: 13, color: "#57534e" }}>{t.where}</span>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>{t.line}</p>
          {t.action && (
            <button onClick={() => t.go && onOpenAlert()} className="wg-press" style={{ alignSelf: "flex-start", border: 0, cursor: "pointer", background: GOLD, color: CREAM, font: `400 13.5px/1 ${serif}`, padding: "11px 18px", borderRadius: 14 }}>{t.action}</button>
          )}
        </div>
      ))}
    </div>
  );
}

/** The "Concierge / Guide" and "Traveler / Advisor" segmented switches — only
 *  ever shown when trip.concierge is true, i.e. only for the showcase. */
export function DemoSegment<T extends string>({
  options,
  current,
  onPick,
  compact,
}: {
  options: [T, string][];
  current: T;
  onPick: (id: T) => void;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 6, padding: 5, background: compact ? "rgba(255,255,255,.8)" : "#ece8df", borderRadius: 14, alignSelf: "flex-start" }}>
      {options.map(([id, label]) => {
        const on = current === id;
        return (
          <button
            key={id}
            onClick={() => onPick(id)}
            style={{ border: 0, cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "10px 16px", borderRadius: 14, background: on ? GOLD : "transparent", color: on ? CREAM : "#57534e" }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
