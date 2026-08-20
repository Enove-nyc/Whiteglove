"use client";

/**
 * The White Glove app — a trip in your pocket.
 *
 * A faithful build of the mobile design: a day at a time, the kosher side of
 * each day, the Shabbos that stops early, a travel wallet kept on the phone for
 * when there is no signal, and an advisor thread. Two ways to read it —
 * Concierge (an advisor is holding the trip) and Guide (the same trip, on your
 * own) — and two sides to stand on, the traveller's and the advisor's.
 *
 * ALL OF ITS CONTENT IS A PROP. It takes a CompanionTrip and renders it; the
 * demo Rome week is only the default. When a Business account's own itinerary
 * is handed in — built from lib/account-store.ts and the site's kosher, Shabbos
 * and destination records — nothing here changes but the data.
 *
 * THE STATE IS THE WHOLE POINT OF THE DESIGN. Open the rain notice, pick one of
 * the two afternoons, and the day, the chat and the notice all move together —
 * because they are all read off one piece of state, the way the real thing has
 * to be.
 */

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  COMPANION_DEMO_TRIP,
  COMPANION_KIND,
  type CompanionItem,
  type CompanionTrip,
} from "@/data/companion-demo";

type Screen = "home" | "day" | "activity" | "chat" | "messages" | "alerts" | "wallet" | "profile";
type ChatSide = "client" | "advisor";
/** The live thread on this trip — present once the trip has been shared. */
export type CompanionChat = { shareId: string; side: ChatSide; advisorName: string };
type Mode = "concierge" | "guide";
type Role = "traveler" | "advisor";
type TStyle = "rail" | "cards" | "bands";
type SwapId = "a" | "b";

type State = {
  screen: Screen;
  prev: Screen | null;
  selDay: number;
  actIdx: number;
  actDay: number;
  pick: SwapId | null;
  swap: SwapId | null;
  draft: string;
  typing: boolean;
  tstyle: TStyle;
  tmode: Mode;
  role: Role;
  messages: { from: "them" | "me"; text: string }[];
};

const GOLD = "#b78a4a";
const CREAM = "#f7f5f0";

/** A decorated timeline item — the palette folded in, ready to render. */
type DecItem = CompanionItem & {
  dot: string;
  tint: string;
  kindLabel: string;
  kindFg: string;
};

export default function CompanionApp({
  trip = COMPANION_DEMO_TRIP,
  chat,
  advisorInbox = false,
}: {
  trip?: CompanionTrip;
  chat?: CompanionChat;
  /** The advisor's own side: a Messages tab that lists every client's chat. */
  advisorInbox?: boolean;
}) {
  const liveChat = chat ?? null;
  const hasMessages = Boolean(liveChat) || advisorInbox;
  const [st, setSt] = useState<State>({
    screen: "home",
    prev: null,
    selDay: trip.todayIndex,
    actIdx: 0,
    actDay: trip.todayIndex,
    pick: null,
    swap: null,
    draft: "",
    typing: false,
    tstyle: "rail",
    tmode: trip.concierge ? "concierge" : "guide",
    role: "traveler",
    messages: trip.messages ?? [],
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const advisor = trip.advisorName;
  const firstName = advisor.split(" ")[0];
  // The place, for the guide card — "The Cohens · Rome" → "Rome".
  const placeName = trip.homeTitle.includes("·")
    ? trip.homeTitle.split("·").pop()!.trim()
    : trip.homeTitle;

  // The days, with the today swap applied to its swappable item.
  const days = trip.days.map((d, i) => {
    if (i !== trip.todayIndex || !st.swap || !trip.swaps) return d;
    const swapped = trip.swaps[st.swap].item;
    return { ...d, items: d.items.map((it) => (it.swappable ? swapped : it)) };
  });

  function go(screen: Screen) {
    setSt((s) => ({ ...s, screen, prev: s.screen }));
  }
  function back() {
    setSt((s) => ({ ...s, screen: s.prev && s.prev !== s.screen ? s.prev : "home", prev: null }));
  }

  function send(text?: string) {
    const t = (text ?? st.draft).trim();
    if (!t) return;
    setSt((s) => ({ ...s, messages: [...s.messages, { from: "me", text: t }], draft: "", typing: true }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSt((s) => ({
        ...s,
        typing: false,
        messages: [
          ...s.messages,
          { from: "them", text: "On it — give me five minutes and I will come back with something held rather than something to check." },
        ],
      }));
    }, 1600);
  }

  function decorate(it: CompanionItem): DecItem {
    const k = COMPANION_KIND[it.kind] || COMPANION_KIND.rest;
    return { ...it, dot: k.dot, tint: k.tint, kindLabel: k.label, kindFg: k.fg };
  }

  const hasConcierge = trip.concierge;
  const isConcierge = hasConcierge && st.tmode === "concierge";
  const isGuideMode = !isConcierge;
  const sel = days[st.selDay];
  const items = sel.items.map(decorate);
  const hasSwap = Boolean(trip.swaps);
  const open = hasSwap && !st.swap; // an open weather alert waiting on a decision
  const settled = hasSwap && Boolean(st.swap); // one was picked
  const handledSteps = trip.handledSteps ?? [];
  const advisorTrips = trip.advisorTrips ?? [];
  const advisorHome = hasConcierge && st.role === "advisor" && st.screen === "home";

  const titles: Record<Screen, string> = {
    home: trip.homeTitle,
    day: sel.name,
    activity: "On the day",
    chat: advisor,
    messages: advisorInbox ? "Messages" : liveChat ? (liveChat.side === "advisor" ? "Your client" : liveChat.advisorName) : "Messages",
    alerts: "Changes",
    wallet: "Travel wallet",
    profile: "You",
  };
  const kickers: Record<Screen, string> = {
    home: trip.homeKicker,
    day: `Day ${st.selDay + 1} of ${trip.days.length}`,
    activity: sel.name,
    chat: hasConcierge ? "Your advisor" : "On your own",
    messages: advisorInbox ? "Your clients" : liveChat?.side === "advisor" ? "Their trip, and yours to move" : "Your advisor · replies when they can",
    alerts: open ? "One needs you" : settled ? "All settled" : "Nothing right now",
    wallet: "Kept offline",
    profile: hasConcierge ? "The trip is in your name" : "This trip, and you",
  };

  const act = days[st.actDay].items[st.actIdx] || days[st.actDay].items[0];
  const actKind = COMPANION_KIND[act.kind] || COMPANION_KIND.rest;

  const bandOf = (t: string) => {
    const h = parseInt(t || "0", 10);
    return h < 12 ? 0 : h < 17 ? 1 : 2;
  };
  const bandDefs: [string, string][] = [
    ["Morning", "06:00 – 12:00"],
    ["Afternoon", "12:00 – 17:00"],
    ["Evening", "after 17:00"],
  ];
  const bands = bandDefs
    .map(([name, span], bi) => ({ name, span, items: items.filter((it) => bandOf(it.time) === bi) }))
    .filter((b) => b.items.length);

  const seg = <T extends string>(list: [T, string][], cur: T, set: (id: T) => void) =>
    list.map(([id, label]) => ({
      id,
      label,
      bg: cur === id ? GOLD : "transparent",
      fg: cur === id ? CREAM : "#57534e",
      pick: () => set(id),
    }));

  const styleOpts = seg<TStyle>(
    [["rail", "Rail"], ["cards", "Cards"], ["bands", "Bands"]],
    st.tstyle,
    (id) => setSt((s) => ({ ...s, tstyle: id })),
  );
  const tmodeOpts = seg<Mode>(
    [["concierge", "Concierge"], ["guide", "Guide"]],
    st.tmode,
    (id) => setSt((s) => ({ ...s, tmode: id })),
  );
  const roleOpts = seg<Role>(
    [["traveler", "Traveler"], ["advisor", "Advisor"]],
    st.role,
    (id) => setSt((s) => ({ ...s, role: id })),
  );

  const confirmSwap = () => {
    if (!st.pick || !trip.swaps) return;
    const p = st.pick;
    const reply = trip.swaps[p].reply;
    setSt((s) => ({
      ...s,
      swap: p,
      screen: "day",
      prev: "alerts",
      selDay: trip.todayIndex,
      messages: [
        ...s.messages,
        { from: "me", text: p === "a" ? "Thursday morning works for us." : "Let's do Palazzo Massimo." },
        { from: "them", text: reply },
      ],
    }));
  };

  const openActivity = (di: number, i: number) =>
    setSt((s) => ({ ...s, screen: "activity", prev: s.screen, actIdx: i, actDay: di }));

  const tabDefs: [Screen, string][] = [["home", "Trip"], ["chat", isGuideMode ? "Guide" : "Concierge"]];
  if (hasMessages) tabDefs.push(["messages", "Messages"]);
  tabDefs.push(["wallet", "Wallet"], ["profile", "You"]);
  const tabs = tabDefs.map(([id, label]) => {
    const on = st.screen === id || (id === "home" && (st.screen === "day" || st.screen === "activity" || st.screen === "alerts"));
    return { id, label, bg: on ? GOLD : "transparent", fg: on ? CREAM : "#57534e" };
  });

  const quickReplies = (
    st.role === "advisor"
      ? ["Two options, both held", "Running twenty minutes late", "Candle-lighting is 16:52"]
      : ["Can we move the Vatican?", "Where do we eat tonight?", "Is the guide confirmed?"]
  );

  // The activity detail rows, read off the stop itself rather than invented.
  const actRows = [
    act.time ? { label: "When", value: act.time } : null,
    act.place ? { label: "Where", value: act.place } : null,
    act.walk ? { label: "On foot", value: act.walk } : null,
    { label: "Kind", value: actKind.label },
  ].filter(Boolean) as { label: string; value: string }[];

  // ── shared bits of style ────────────────────────────────────────────────
  const serif = "Georgia,'Times New Roman',serif";
  const kicker = (color: string): CSSProperties => ({
    font: `600 10.5px/1 Inter,sans-serif`,
    letterSpacing: ".13em",
    textTransform: "uppercase",
    color,
  });

  // ── screens ─────────────────────────────────────────────────────────────
  const homeScreen = (
    <div style={{ animation: "wgIn .28s ease both" }}>
      <div style={{ position: "relative", margin: "14px 14px 0", height: 196, borderRadius: 20, overflow: "hidden", background: "repeating-linear-gradient(135deg,#ece8df 0 11px,#f7f5f0 11px 22px)", filter: "saturate(.6) contrast(.85) brightness(1.1)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 14 }}>
          <span style={{ font: "400 10px/1 ui-monospace,Menlo,monospace", letterSpacing: ".06em", color: "#57534e", background: "rgba(255,255,255,.85)", padding: "6px 10px", borderRadius: 14 }}>photo · the Ghetto at dusk</span>
        </div>
      </div>
      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 7 }}>
        <h2 style={{ margin: 0, font: `400 29px/1.08 ${serif}`, letterSpacing: "-.02em" }}>{trip.tripTitle}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", fontSize: 13, color: "#57534e" }}>
          <span>{trip.tripDates}</span>
          <span style={{ width: 4, height: 4, borderRadius: 14, background: "#a8a29e" }} />
          <span style={{ background: "#e7edf1", color: "#1f3f5c", fontWeight: 600, padding: "4px 10px", borderRadius: 14, fontSize: 11.5 }}>Day {trip.todayIndex + 1} of {trip.days.length}</span>
        </div>
      </div>

      {open && (
        <div style={{ margin: "18px 14px 0", padding: "17px 18px", borderRadius: 20, background: "#f7eee0", border: "1px solid rgba(183,138,74,.28)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 14, background: GOLD, animation: "wgPulse 1.8s ease-in-out infinite" }} />
            <span style={kicker("#765321")}>Your afternoon</span>
          </div>
          <div style={{ font: `400 19px/1.2 ${serif}`, color: "#4a3016" }}>Rain from three o&apos;clock</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#5c4322", textWrap: "pretty" }}>The Pantheon and the Trevi Fountain are both open squares. {firstName} has put two ways round it — either is already held.</p>
          <button onClick={() => go("alerts")} className="wg-press" style={{ alignSelf: "flex-start", border: 0, cursor: "pointer", background: GOLD, color: CREAM, font: `400 14px/1 ${serif}`, padding: "12px 20px", borderRadius: 14 }}>See the two options</button>
        </div>
      )}
      {settled && trip.swaps && (
        <div style={{ margin: "18px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#e7edf1", border: "1px solid rgba(21,50,75,.3)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={kicker("#1f3f5c")}>Settled</span>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "#0b2437" }}>{trip.swaps[st.swap!].reply}</div>
        </div>
      )}

      <div style={{ marginTop: 22, paddingLeft: 20 }}>
        <div style={kicker("#78716c")}>{trip.days.length === 8 ? "Eight days" : `${trip.days.length} days`}</div>
      </div>
      <div style={{ display: "flex", gap: 9, overflowX: "auto", padding: "12px 20px 4px", scrollbarWidth: "none" }}>
        {days.map((d, i) => {
          const on = i === st.selDay;
          return (
            <button key={i} onClick={() => setSt((s) => ({ ...s, selDay: i, screen: "day", prev: "home" }))} className="wg-press" style={{ flex: "none", width: 64, padding: "11px 0 12px", borderRadius: 16, border: `1px solid ${on ? GOLD : d.today ? GOLD : "rgba(38,50,58,.1)"}`, background: on ? GOLD : d.today ? "#f7eee0" : "#ffffff", color: on ? CREAM : "#26323a", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ font: "600 10px/1 Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.75 }}>{d.dow}</span>
              <span style={{ font: `400 20px/1 ${serif}` }}>{d.dom}</span>
              <span style={{ fontSize: 9.5, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 56 }}>{d.short}</span>
            </button>
          );
        })}
      </div>

      <div style={{ margin: "22px 14px 0", padding: "20px 18px", borderRadius: 20, background: "#ffffff", border: "1px solid rgba(38,50,58,.08)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0, font: `400 21px/1.1 ${serif}` }}>{sel.name}</h3>
          <button onClick={() => go("day")} className="wg-link" style={{ border: 0, background: "none", cursor: "pointer", font: "600 12px/1 Inter,sans-serif", color: "#765321", padding: 0 }}>Full day →</button>
        </div>
        {items.slice(0, 3).map((it, i) => (
          <button key={i} onClick={() => openActivity(st.selDay, i)} className="wg-fade" style={{ textAlign: "left", border: 0, background: "none", padding: 0, cursor: "pointer", display: "flex", gap: 13, alignItems: "flex-start" }}>
            <span style={{ flex: "none", width: 52, font: "600 12.5px/1.5 ui-monospace,Menlo,monospace", color: "#78716c", paddingTop: 2 }}>{it.time}</span>
            <span style={{ flex: "none", width: 9, height: 9, borderRadius: 14, background: it.dot, marginTop: 6 }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{it.title}</span>
              <span style={{ fontSize: 12.5, color: "#78716c" }}>{it.place}</span>
            </span>
          </button>
        ))}
      </div>

      {trip.kosherTitle && (
        <div style={{ margin: "14px 14px 0", padding: 18, borderRadius: 20, background: "#e7edf1", display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={kicker("#1f3f5c")}>Eating today</span>
          <div style={{ font: `400 17px/1.2 ${serif}`, color: "#0b2437" }}>{trip.kosherTitle}</div>
          {trip.kosherNote && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#0b2437", textWrap: "pretty" }}>{trip.kosherNote}</p>}
        </div>
      )}

      {isConcierge && (
        <div style={{ margin: "14px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#ece8df", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: "repeating-linear-gradient(135deg,#ece8df 0 7px,#ffffff 7px 14px)" }} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{advisor}</span>
            <span style={{ fontSize: 12, color: "#57534e" }}>Your advisor · replies in minutes</span>
          </div>
          <button onClick={() => go("chat")} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "11px 16px", borderRadius: 14, color: "#26323a" }}>Message</button>
        </div>
      )}
      {isGuideMode && (
        <div style={{ margin: "14px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#ece8df", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: "#e7edf1", display: "flex", alignItems: "center", justifyContent: "center", font: `400 20px/1 ${serif}`, color: "#1f3f5c" }}>{placeName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{placeName}, on your own</span>
            <span style={{ fontSize: 12, color: "#57534e" }}>Kosher, Shabbos and the sights nearby</span>
          </div>
          <button onClick={() => go("chat")} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "11px 16px", borderRadius: 14, color: "#26323a" }}>Open guide</button>
        </div>
      )}
      {advisorInbox && (
        <div style={{ margin: "14px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#ece8df", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", font: `400 20px/1 ${serif}`, color: "#765321" }}>❝</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Your clients</span>
            <span style={{ fontSize: 12, color: "#57534e" }}>Every trip you have shared, in one place</span>
          </div>
          <button onClick={() => go("messages")} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "11px 16px", borderRadius: 14, color: "#26323a" }}>Open</button>
        </div>
      )}
      {liveChat && !advisorInbox && (
        <div style={{ margin: "14px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#ece8df", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", font: `400 20px/1 ${serif}`, color: "#765321" }}>
            {(liveChat.side === "advisor" ? trip.family : liveChat.advisorName).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{liveChat.side === "advisor" ? trip.family : liveChat.advisorName}</span>
            <span style={{ fontSize: 12, color: "#57534e" }}>{liveChat.side === "advisor" ? "The client on this trip" : "Your advisor · message anytime"}</span>
          </div>
          <button onClick={() => go("messages")} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "11px 16px", borderRadius: 14, color: "#26323a" }}>Message</button>
        </div>
      )}
      {!liveChat && !advisorInbox && !hasConcierge && trip.contactName && (
        <div style={{ margin: "14px 14px 0", padding: "16px 18px", borderRadius: 20, background: "#f7eee0", border: "1px solid rgba(183,138,74,.25)", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", font: `400 20px/1 ${serif}`, color: "#765321" }}>{trip.contactName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{trip.contactName}</span>
            <span style={{ fontSize: 12, color: "#57534e" }}>Your advisor for this trip</span>
          </div>
        </div>
      )}
      <div style={{ height: 26 }} />
    </div>
  );

  const advisorHomeScreen = (
    <div style={{ padding: "18px 18px 28px", display: "flex", flexDirection: "column", gap: 14, animation: "wgIn .28s ease both" }}>
      <div style={{ padding: 20, borderRadius: 20, background: "#ece8df", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={kicker("#57534e")}>Tuesday 27 October</span>
        <div style={{ font: `400 26px/1.1 ${serif}` }}>Three trips in the air</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#57534e" }}>One needs you now. Two are running to plan.</p>
      </div>
      {advisorTrips.map((t, i) => (
        <div key={i} style={{ padding: 18, borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ font: `400 19px/1.1 ${serif}` }}>{t.family}</span>
            <span style={{ font: "600 10.5px/1 Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: t.statusFg, background: t.statusBg, padding: "6px 10px", borderRadius: 14 }}>{t.status}</span>
          </div>
          <span style={{ fontSize: 13, color: "#57534e" }}>{t.where}</span>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>{t.line}</p>
          {t.action && (
            <button onClick={() => t.go && go(t.go)} className="wg-press" style={{ alignSelf: "flex-start", border: 0, cursor: "pointer", background: GOLD, color: CREAM, font: `400 13.5px/1 ${serif}`, padding: "11px 18px", borderRadius: 14 }}>{t.action}</button>
          )}
        </div>
      ))}
    </div>
  );

  const railView = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "none", width: 54, paddingTop: 3, textAlign: "right", font: "600 12.5px/1.4 ui-monospace,Menlo,monospace", color: "#78716c" }}>{it.time}</div>
          <div style={{ flex: "none", width: 11, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 11, height: 11, borderRadius: 14, background: it.dot, marginTop: 5 }} />
            <span style={{ flex: 1, width: 1.5, background: "rgba(38,50,58,.14)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => openActivity(st.selDay, i)} className="wg-warm" style={{ textAlign: "left", cursor: "pointer", border: "1px solid rgba(38,50,58,.09)", background: "#ffffff", borderRadius: 16, padding: "15px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{it.title}</span>
              <span style={{ fontSize: 12.5, color: "#78716c" }}>{it.place}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>{it.note}</span>
            </button>
            {it.walk && <span style={{ font: "400 11px/1 ui-monospace,Menlo,monospace", color: "#a8a29e", paddingLeft: 2 }}>{it.walk}</span>}
          </div>
        </div>
      ))}
    </div>
  );

  const cardsView = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it, i) => (
        <button key={i} onClick={() => openActivity(st.selDay, i)} className="wg-fade" style={{ textAlign: "left", cursor: "pointer", border: 0, borderRadius: 20, padding: 20, background: it.tint, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ font: "600 11px/1 Inter,sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: it.kindFg }}>{it.kindLabel}</span>
            <span style={{ font: "600 12.5px/1 ui-monospace,Menlo,monospace", color: "#78716c" }}>{it.time}</span>
          </span>
          <span style={{ font: `400 21px/1.12 ${serif}`, letterSpacing: "-.01em" }}>{it.title}</span>
          <span style={{ fontSize: 13, color: "#57534e" }}>{it.place}</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>{it.note}</span>
        </button>
      ))}
    </div>
  );

  const bandsView = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {bands.map((b, bi) => (
        <div key={bi} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ font: `400 15px/1 ${serif}`, color: "#765321" }}>{b.name}</span>
            <span style={{ flex: 1, height: 1, background: "rgba(38,50,58,.12)" }} />
            <span style={{ font: "400 11px/1 ui-monospace,Menlo,monospace", color: "#a8a29e" }}>{b.span}</span>
          </div>
          {b.items.map((it, i) => (
            <button key={i} onClick={() => openActivity(st.selDay, items.indexOf(it))} className="wg-fade" style={{ textAlign: "left", cursor: "pointer", border: 0, background: "none", padding: 0, display: "flex", gap: 12, alignItems: "stretch" }}>
              <span style={{ flex: "none", width: 6, borderRadius: 14, background: it.dot }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, padding: "4px 0" }}>
                <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>{it.title}</span>
                <span style={{ fontSize: 12.5, color: "#78716c" }}>{it.time} · {it.place}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>{it.note}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  const dayScreen = (
    <div style={{ padding: "16px 18px 28px", display: "flex", flexDirection: "column", gap: 16, animation: "wgIn .28s ease both" }}>
      {(sel.weather || sel.walk) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {sel.weather && <span style={{ font: "600 11.5px/1 Inter,sans-serif", background: "#ece8df", color: "#57534e", padding: "8px 12px", borderRadius: 14 }}>{sel.weather}</span>}
          {sel.walk && <span style={{ font: "600 11.5px/1 Inter,sans-serif", background: "#ece8df", color: "#57534e", padding: "8px 12px", borderRadius: 14 }}>{sel.walk}</span>}
        </div>
      )}
      {sel.shabbosNote && (
        <div style={{ padding: "17px 18px", borderRadius: 20, background: "#e7edf1", border: "1px solid rgba(21,50,75,.32)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={kicker("#1f3f5c")}>{sel.shabbosLabel}</span>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#0b2437", textWrap: "pretty" }}>{sel.shabbosNote}</p>
        </div>
      )}
      {st.tstyle === "rail" && railView}
      {st.tstyle === "cards" && cardsView}
      {st.tstyle === "bands" && bandsView}
      <button onClick={() => go("chat")} className="wg-warm" style={{ alignSelf: "flex-start", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 13.5px/1 ${serif}`, padding: "12px 18px", borderRadius: 14, color: "#26323a" }}>Ask about this day</button>
    </div>
  );

  const activityScreen = (
    <div style={{ animation: "wgIn .28s ease both" }}>
      <div style={{ position: "relative", margin: "14px 14px 0", height: 172, borderRadius: 20, overflow: "hidden", background: "repeating-linear-gradient(135deg,#ece8df 0 11px,#f7f5f0 11px 22px)", filter: "saturate(.6) contrast(.85) brightness(1.1)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ font: "400 10px/1 ui-monospace,Menlo,monospace", letterSpacing: ".06em", color: "#57534e", background: "rgba(255,255,255,.85)", padding: "6px 10px", borderRadius: 14 }}>photo · {act.title.toLowerCase()}</span>
        </div>
      </div>
      <div style={{ padding: "18px 20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={kicker("#765321")}>{act.time ? `${act.time} · ${actKind.label}` : actKind.label}</span>
          <h2 style={{ margin: 0, font: `400 27px/1.08 ${serif}`, letterSpacing: "-.02em" }}>{act.title}</h2>
          <span style={{ fontSize: 13.5, color: "#57534e" }}>{act.place}</span>
        </div>
        {act.note && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#26323a", textWrap: "pretty" }}>{act.note}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(38,50,58,.09)" }}>
          {actRows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "14px 16px", background: "#ffffff" }}>
              <span style={{ flex: "none", font: "600 11px/1 Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#78716c" }}>{r.label}</span>
              <span style={{ textAlign: "right", fontSize: 13.5, lineHeight: 1.4, color: "#26323a" }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 138, borderRadius: 20, background: "repeating-linear-gradient(45deg,#e7edf1 0 13px,#e7edf1 13px 26px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ font: "400 10px/1 ui-monospace,Menlo,monospace", letterSpacing: ".06em", color: "#1f3f5c", background: "rgba(255,255,255,.85)", padding: "6px 10px", borderRadius: 14 }}>map · walk from the hotel, 22 min</span>
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button className="wg-press" style={{ border: 0, cursor: "pointer", background: GOLD, color: CREAM, font: `400 14px/1 ${serif}`, padding: "13px 20px", borderRadius: 14 }}>Directions</button>
          <button onClick={() => go("chat")} className="wg-warm" style={{ border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", font: `400 14px/1 ${serif}`, padding: "13px 20px", borderRadius: 14, color: "#26323a" }}>Ask to move this</button>
        </div>
      </div>
    </div>
  );

  const alertsScreen = (
    <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 14, animation: "wgIn .28s ease both" }}>
      {open && (
        <div style={{ padding: "20px 18px", borderRadius: 20, background: "#f7eee0", border: "1px solid rgba(183,138,74,.28)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 14, background: GOLD, animation: "wgPulse 1.8s ease-in-out infinite" }} />
            <span style={kicker("#765321")}>Needs you · today 14:10</span>
          </div>
          <div style={{ font: `400 22px/1.1 ${serif}`, color: "#4a3016" }}>Rain from three o&apos;clock</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#5c4322", textWrap: "pretty" }}>Both options are held until five. Pick one and I will move the rest of the day round it.</p>
          {(["a", "b"] as SwapId[]).map((id) => {
            const o = trip.swaps![id];
            const on = st.pick === id;
            return (
              <button key={id} onClick={() => setSt((s) => ({ ...s, pick: id }))} style={{ textAlign: "left", cursor: "pointer", border: `1.5px solid ${on ? GOLD : "rgba(38,50,58,.12)"}`, background: on ? "#f0e0c2" : "#ffffff", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
                  <span style={{ font: `400 17px/1.15 ${serif}` }}>{o.title}</span>
                  <span style={{ flex: "none", width: 20, height: 20, borderRadius: 14, border: `1.5px solid ${on ? GOLD : "rgba(38,50,58,.2)"}`, background: on ? GOLD : "transparent" }} />
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>{o.note}</span>
                <span style={{ font: "400 11px/1 ui-monospace,Menlo,monospace", color: "#78716c" }}>{o.meta}</span>
              </button>
            );
          })}
          <button onClick={confirmSwap} disabled={!st.pick} className="wg-press" style={{ border: 0, cursor: st.pick ? "pointer" : "default", background: GOLD, color: CREAM, font: `400 15px/1 ${serif}`, padding: "15px 20px", borderRadius: 14, opacity: st.pick ? 1 : 0.45 }}>
            {st.pick ? `Confirm ${st.pick === "a" ? "Thursday morning" : "Palazzo Massimo"}` : "Pick one of the two"}
          </button>
        </div>
      )}
      {settled && trip.swaps && (
        <div style={{ padding: "20px 18px", borderRadius: 20, background: "#e7edf1", border: "1px solid rgba(21,50,75,.3)", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={kicker("#1f3f5c")}>Settled · just now</span>
          <div style={{ font: `400 21px/1.12 ${serif}`, color: "#0b2437" }}>{trip.swaps[st.swap!].item.title}</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#0b2437", textWrap: "pretty" }}>{trip.swaps[st.swap!].reply}</p>
          <button onClick={() => go("day")} className="wg-navy" style={{ alignSelf: "flex-start", border: "1px solid rgba(21,50,75,.4)", background: "none", cursor: "pointer", font: `400 13.5px/1 ${serif}`, padding: "11px 17px", borderRadius: 14, color: "#0b2437" }}>See the new day</button>
        </div>
      )}
      {!open && !settled && handledSteps.length === 0 && (
        <div style={{ padding: "22px 18px", borderRadius: 20, background: "#ffffff", border: "1px solid rgba(38,50,58,.08)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={kicker("#78716c")}>Changes</span>
          <div style={{ font: `400 20px/1.15 ${serif}` }}>Nothing needs a decision</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>When something on the trip moves, it shows up here — with what changed and what, if anything, it asks of you.</p>
        </div>
      )}
      {handledSteps.length > 0 && (
      <div style={{ padding: "20px 18px", borderRadius: 20, background: "#ffffff", border: "1px solid rgba(38,50,58,.08)", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={kicker("#78716c")}>Handled for you · Monday 07:20</span>
        <div style={{ font: `400 21px/1.12 ${serif}` }}>Sunday&apos;s flight home moved to 13:05</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>The airline moved it by an hour and three quarters. Nothing was asked of you; here is what happened.</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {handledSteps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: "none", width: 11, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 11, height: 11, borderRadius: 14, background: "#15324b", marginTop: 4 }} />
                {i < handledSteps.length - 1 && <span style={{ flex: 1, width: 1.5, background: "rgba(38,50,58,.12)" }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{s.what}</span>
                <span style={{ font: "400 11.5px/1.4 ui-monospace,Menlo,monospace", color: "#a8a29e" }}>{s.when}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );

  const conciergeChat = (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", animation: "wgIn .28s ease both" }}>
      <div style={{ flex: 1, padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ alignSelf: "center", font: "400 11px/1 ui-monospace,Menlo,monospace", color: "#a8a29e", background: "#ece8df", padding: "7px 12px", borderRadius: 14 }}>Tuesday 27 October</div>
        {st.messages.map((m, i) => {
          const mine = m.from === "me";
          return (
            <div key={i} style={{ maxWidth: "80%", alignSelf: mine ? "flex-end" : "flex-start", background: mine ? GOLD : "#ffffff", color: mine ? CREAM : "#26323a", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "13px 15px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(23,45,82,.08)" }}>{m.text}</div>
          );
        })}
        {st.typing && (
          <div style={{ alignSelf: "flex-start", background: "#ffffff", borderRadius: "14px 14px 14px 4px", padding: "14px 18px", font: "400 12px/1 ui-monospace,Menlo,monospace", color: "#78716c", animation: "wgPulse 1.2s ease-in-out infinite" }}>{(st.role === "advisor" ? "The Cohens are" : `${firstName} is`)} typing…</div>
        )}
      </div>
      <div style={{ flexShrink: 0, position: "sticky", bottom: 0, background: CREAM, borderTop: "1px solid rgba(38,50,58,.08)", padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
          {quickReplies.map((q, i) => (
            <button key={i} onClick={() => send(q)} className="wg-warm" style={{ flex: "none", border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", cursor: "pointer", fontSize: 12.5, padding: "9px 14px", borderRadius: 14, color: "#26323a", whiteSpace: "nowrap" }}>{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input value={st.draft} onChange={(e) => setSt((s) => ({ ...s, draft: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={st.role === "advisor" ? "Reply to the Cohens…" : `Ask ${firstName} anything…`} style={{ flex: 1, minWidth: 0, border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", borderRadius: 14, padding: "14px 17px", fontFamily: "Inter,sans-serif", fontSize: 14, color: "#26323a", outline: "none" }} />
          <button onClick={() => send()} className="wg-press" style={{ flex: "none", border: 0, cursor: "pointer", background: GOLD, color: CREAM, width: 46, height: 46, borderRadius: 14, fontSize: 17, padding: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );

  const guideChat = (
    <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 18, animation: "wgIn .28s ease both" }}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "#57534e", textWrap: "pretty" }}>
        {trip.guideSections.length > 0
          ? "Built the same way as your itinerary — everything below is a record this site already publishes, kept here so it works with no signal."
          : "The kosher food, the Shabbos times and the sights near this trip land here, kept on the phone for when there is no signal."}
      </p>
      {trip.guideSections.map((g, gi) => (
        <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ ...kicker("#78716c"), paddingLeft: 4 }}>{g.name}</div>
          {g.items.map((it, i) => (
            <div key={i} style={{ padding: "16px 18px", borderRadius: 16, background: it.tint, display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{it.title}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#26323a", textWrap: "pretty" }}>{it.note}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const walletScreen = (
    <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 16, animation: "wgIn .28s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, font: "400 11.5px/1 ui-monospace,Menlo,monospace", color: "#1f3f5c", background: "#e7edf1", padding: "10px 14px", borderRadius: 14, alignSelf: "flex-start" }}>
        <span style={{ width: 7, height: 7, borderRadius: 14, background: "#15324b" }} />Kept on the phone — works with no signal
      </div>
      {trip.walletGroups.length === 0 && (
        <p style={{ margin: "4px 4px 0", fontSize: 13.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>Flights, where you are staying and anything held for you appear here as they are added to the trip.</p>
      )}
      {trip.walletGroups.map((g, gi) => (
        <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ ...kicker("#78716c"), paddingLeft: 4 }}>{g.name}</div>
          {g.rows.map((r, i) => (
            <div key={i} style={{ padding: "16px 18px", borderRadius: 16, background: "#ffffff", border: "1px solid rgba(38,50,58,.08)", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.25 }}>{r.title}</span>
                <span style={{ flex: "none", font: "400 11.5px/1 ui-monospace,Menlo,monospace", color: "#78716c" }}>{r.ref}</span>
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>{r.sub}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const profileScreen = (
    <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 16, animation: "wgIn .28s ease both" }}>
      <div style={{ padding: 20, borderRadius: 20, background: "#ece8df", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: "none", width: 54, height: 54, borderRadius: 14, background: "repeating-linear-gradient(135deg,#ece8df 0 7px,#ffffff 7px 14px)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: `400 21px/1.1 ${serif}` }}>{trip.family}</span>
          <span style={{ fontSize: 13, color: "#57534e" }}>{trip.familyMeta}</span>
        </div>
      </div>
      {trip.prefs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ ...kicker("#78716c"), paddingLeft: 4 }}>From your planning answers</div>
          {trip.prefs.map((p, i) => (
            <div key={i} style={{ padding: "15px 18px", borderRadius: 16, background: "#ffffff", border: "1px solid rgba(38,50,58,.08)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
              <span style={{ font: "600 11px/1 Inter,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#78716c" }}>{p.label}</span>
              <span style={{ textAlign: "right", fontSize: 13.5, lineHeight: 1.4 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}
      {/* Trip kind — Concierge or Guide — lives here on the phone, where the
          desktop showcase has it as a toolbar above the frame. Only when a
          live advisor is attached; a wired trip is read one way. */}
      {hasConcierge && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ ...kicker("#78716c"), paddingLeft: 4 }}>How you are reading this trip</div>
          <div style={{ display: "flex", gap: 6, padding: 5, background: "#ece8df", borderRadius: 14, alignSelf: "flex-start" }}>
            {tmodeOpts.map((o) => (
              <button key={o.id} onClick={o.pick} style={{ border: 0, cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "10px 16px", borderRadius: 14, background: o.bg, color: o.fg }}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: 20, borderRadius: 20, background: "#f7eee0", border: "1px solid rgba(183,138,74,.25)", display: "flex", flexDirection: "column", gap: 11 }}>
        <span style={kicker("#765321")}>Signed in as</span>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#5c4322", textWrap: "pretty" }}>{st.role === "advisor" ? "The advisor side: the trips you are holding today, and the one that needs a decision from you." : "The trip is in your name. Two others can look at it; nobody but you can change it."}</p>
        {hasConcierge && (
          <div style={{ display: "flex", gap: 6, padding: 5, background: "rgba(255,255,255,.8)", borderRadius: 14, alignSelf: "flex-start" }}>
            {roleOpts.map((r) => (
              <button key={r.id} onClick={r.pick} style={{ border: 0, cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "10px 16px", borderRadius: 14, background: r.bg, color: r.fg }}>{r.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  let body: ReactNode = null;
  if (advisorHome) body = advisorHomeScreen;
  else if (st.screen === "home") body = homeScreen;
  else if (st.screen === "day") body = dayScreen;
  else if (st.screen === "activity") body = activityScreen;
  else if (st.screen === "alerts") body = alertsScreen;
  else if (st.screen === "chat") body = isConcierge ? conciergeChat : guideChat;
  else if (st.screen === "messages") body = advisorInbox ? <AdvisorInbox /> : liveChat ? <LiveChat chat={liveChat} /> : guideChat;
  else if (st.screen === "wallet") body = walletScreen;
  else if (st.screen === "profile") body = profileScreen;

  const canBack = st.screen !== "home";

  // ── the phone itself ────────────────────────────────────────────────────
  const phone = (
    <div className="wg-phone" style={{ display: "flex", flexDirection: "column", background: CREAM, fontFamily: "Inter,system-ui,sans-serif", overflow: "hidden" }}>
      {/* header */}
      <div style={{ flexShrink: 0, padding: "18px 18px 10px", display: "flex", alignItems: "center", gap: 10, background: CREAM, borderBottom: "1px solid rgba(38,50,58,.08)" }}>
        {canBack && (
          <button onClick={back} className="wg-fade" style={{ border: "1px solid rgba(38,50,58,.14)", background: "#ffffff", width: 34, height: 34, borderRadius: 14, cursor: "pointer", fontSize: 15, color: "#57534e", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>←</button>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ font: "600 9.5px/1 Inter,sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#a8a29e" }}>{kickers[st.screen]}</div>
          <div style={{ font: `400 19px/1.15 ${serif}`, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titles[st.screen]}</div>
        </div>
        <button onClick={() => go("alerts")} className="wg-fade" style={{ position: "relative", border: "1px solid rgba(38,50,58,.14)", background: "#ffffff", height: 34, padding: "0 13px", borderRadius: 14, cursor: "pointer", font: "600 11.5px/1 Inter,sans-serif", color: "#57534e" }}>
          Changes
          {open && <span style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: 14, background: GOLD, border: `2px solid ${CREAM}` }} />}
        </button>
      </div>
      {/* content */}
      <div className="wg-scroll" style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>{body}</div>
      {/* tabs */}
      <div style={{ flexShrink: 0, padding: "9px 12px", background: "#ece8df", borderTop: "1px solid rgba(38,50,58,.08)", display: "flex", gap: 5 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} style={{ flex: 1, border: 0, cursor: "pointer", background: t.bg, color: t.fg, font: `400 13px/1 ${serif}`, padding: "12px 6px", borderRadius: 14 }}>{t.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="wg-app-root">
      <style>{CSS}</style>
      {/* Desktop showcase chrome — the intro and the two toolbars, shown in the
          browser and hidden once the app is installed to the home screen. */}
      <div className="wg-chrome">
        <div className="wg-chrome-head">
          <div className="wg-chrome-intro">
            <div style={{ font: "600 11px/1 Inter,sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#c8a76a" }}>White Glove · app</div>
            <h1 style={{ font: `400 40px/1.06 ${serif}`, letterSpacing: "-.015em", margin: 0, color: "#f7f5f0" }}>The trip in your pocket</h1>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#c9d3da", textWrap: "pretty" }}>{hasConcierge ? "Built on the itinerary the planner already produces — a day at a time, the kosher side of each day, the Friday that stops early, and an advisor who has usually moved before you notice." : "Built on the itinerary the planner already produces — a day at a time, the kosher side of each day, the Friday that stops early, and a travel wallet kept for when there is no signal."}</p>
          </div>
          <div className="wg-toolbar-group">
            <div className="wg-toolbar-label">Day timeline</div>
            <div className="wg-toolbar">
              {styleOpts.map((o) => (
                <button key={o.id} onClick={o.pick} style={{ border: 0, cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "9px 15px", borderRadius: 14, background: o.bg, color: o.fg }}>{o.label}</button>
              ))}
            </div>
          </div>
          {hasConcierge && (
            <div className="wg-toolbar-group">
              <div className="wg-toolbar-label">Trip kind</div>
              <div className="wg-toolbar">
                {tmodeOpts.map((o) => (
                  <button key={o.id} onClick={o.pick} style={{ border: 0, cursor: "pointer", font: `400 13px/1 ${serif}`, padding: "9px 15px", borderRadius: 14, background: o.bg, color: o.fg }}>{o.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="wg-stage">
        <div className="wg-frame">{phone}</div>
      </div>

      {hasConcierge && (
        <p className="wg-hint">Try it: open the rain notice, pick one of the two afternoons, then look at Tuesday again. The day, the chat and the notice all move together. Switch to the advisor side under <strong style={{ fontWeight: 600, color: "#e7d3ad" }}>You</strong>.</p>
      )}
    </div>
  );
}

/**
 * The real thread on a shared trip — the client and the advisor, in one place.
 *
 * Both sides poll the same endpoint keyed by the trip's share token; who is
 * "me" is the side this app was opened as. No fabricated replies here — a
 * message sits until the other person answers, which is the honest thing.
 */
function LiveChat({ chat }: { chat: CompanionChat }) {
  const { shareId, side, advisorName } = chat;
  const [messages, setMessages] = useState<{ from: ChatSide; text: string; at: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/companion/chat?share=${encodeURIComponent(shareId)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setMessages(Array.isArray(d.messages) ? d.messages : []);
      setAvailable(d.available !== false);
      setLoaded(true);
    } catch {
      /* keep what we have; the next poll may reach it */
    }
  }, [shareId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    setDraft("");
    try {
      const r = await fetch("/api/companion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: shareId, text: t }),
      });
      if (r.ok) {
        const d = await r.json();
        setMessages(Array.isArray(d.messages) ? d.messages : []);
      } else {
        void load();
      }
    } finally {
      setSending(false);
    }
  }

  const otherName = side === "advisor" ? "your client" : advisorName.split(" ")[0];

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", animation: "wgIn .28s ease both" }}>
      <div ref={scrollerRef} className="wg-scroll" style={{ flex: 1, overflow: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {!available && (
          <div style={{ alignSelf: "center", textAlign: "center", font: "400 12px/1.5 Inter,sans-serif", color: "#765321", background: "#f7eee0", padding: "10px 14px", borderRadius: 14 }}>
            Messaging isn&apos;t connected yet.
          </div>
        )}
        {available && loaded && messages.length === 0 && (
          <div style={{ alignSelf: "center", maxWidth: "80%", textAlign: "center", font: "400 13px/1.6 Inter,sans-serif", color: "#78716c" }}>
            {side === "advisor" ? "No messages yet. Anything you send reaches your client on their app." : `No messages yet. Anything you send reaches ${advisorName}.`}
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.from === side;
          return (
            <div key={i} style={{ maxWidth: "80%", alignSelf: mine ? "flex-end" : "flex-start", background: mine ? GOLD : "#ffffff", color: mine ? CREAM : "#26323a", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "13px 15px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(23,45,82,.08)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {m.text}
            </div>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, position: "sticky", bottom: 0, background: CREAM, borderTop: "1px solid rgba(38,50,58,.08)", padding: "12px 14px 16px", display: "flex", gap: 9, alignItems: "center" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder={side === "advisor" ? "Reply to your client…" : `Message ${otherName}…`}
          style={{ flex: 1, minWidth: 0, border: "1px solid rgba(38,50,58,.16)", background: "#ffffff", borderRadius: 14, padding: "14px 17px", fontFamily: "Inter,sans-serif", fontSize: 14, color: "#26323a", outline: "none" }}
        />
        <button onClick={() => void send()} disabled={sending} className="wg-press" style={{ flex: "none", border: 0, cursor: "pointer", background: GOLD, color: CREAM, width: 46, height: 46, borderRadius: 14, fontSize: 17, padding: 0, opacity: sending ? 0.6 : 1 }}>↑</button>
      </div>
    </div>
  );
}

type InboxConvo = {
  shareId: string;
  name: string;
  client: string;
  count: number;
  lastText: string;
  lastFrom: ChatSide | null;
  lastAt: string;
};

/**
 * The advisor's inbox — one conversation per client they have shared a trip
 * with. Tap one to open that thread; every client is its own chat, and this is
 * the one place they all live.
 */
function AdvisorInbox() {
  const serif = "Georgia,'Times New Roman',serif";
  const [convos, setConvos] = useState<InboxConvo[] | null>(null);
  const [open, setOpen] = useState<InboxConvo | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/companion/chats", { cache: "no-store" });
      if (!r.ok) {
        setConvos((prev) => prev ?? []); // don't hang on "Loading…" if the first read fails
        return;
      }
      const d = await r.json();
      setConvos(Array.isArray(d.conversations) ? d.conversations : []);
    } catch {
      setConvos((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  if (open) {
    return (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", animation: "wgIn .28s ease both" }}>
        <button onClick={() => setOpen(null)} className="wg-warm" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, border: 0, borderBottom: "1px solid rgba(38,50,58,.08)", background: "#ece8df", cursor: "pointer", padding: "12px 16px", textAlign: "left" }}>
          <span style={{ fontSize: 15, color: "#57534e" }}>←</span>
          <span style={{ font: `400 17px/1.1 ${serif}` }}>{open.client || open.name}</span>
        </button>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <LiveChat chat={{ shareId: open.shareId, side: "advisor", advisorName: open.client || open.name }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 10, animation: "wgIn .28s ease both" }}>
      {convos === null && <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#a8a29e" }}>Loading…</div>}
      {convos && convos.length === 0 && (
        <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: `400 19px/1.2 ${serif}` }}>No conversations yet.</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#57534e", textWrap: "pretty" }}>Create a client app link on a trip in the planner and share it. When the client opens it, your chat with them appears here.</span>
        </div>
      )}
      {convos?.map((c) => {
        const preview = c.lastText ? `${c.lastFrom === "advisor" ? "You: " : ""}${c.lastText}` : "No messages yet";
        return (
          <button key={c.shareId} onClick={() => setOpen(c)} className="wg-warm" style={{ textAlign: "left", cursor: "pointer", border: "1px solid rgba(38,50,58,.08)", background: "#ffffff", borderRadius: 16, padding: "15px 16px", display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: "#e7edf1", display: "flex", alignItems: "center", justifyContent: "center", font: `400 18px/1 ${serif}`, color: "#1f3f5c" }}>{(c.client || c.name || "?").charAt(0).toUpperCase()}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.client || c.name}</span>
              <span style={{ fontSize: 12.5, color: "#78716c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const CSS = `
@keyframes wgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes wgPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.wg-app-root { min-height: 100dvh; background: #15324b; color: #26323a; }
.wg-scroll::-webkit-scrollbar, .wg-toolbar::-webkit-scrollbar { display: none; }
.wg-press:hover { filter: brightness(.95); }
.wg-fade:hover { opacity: .72; }
.wg-warm:hover { background: #f7eee0; }
.wg-link:hover { color: #96733a; }
.wg-navy:hover { background: rgba(21,50,75,.12); }

/* Phone: full screen on a phone, a device in a frame on a desktop. */
.wg-phone { height: 100dvh; width: 100%; }
.wg-stage { display: flex; justify-content: center; }
.wg-frame { width: 100%; }
.wg-chrome { display: none; }
.wg-hint { display: none; }

/* Installed to the home screen: only the app, never the showcase chrome. */
@media (display-mode: standalone) {
  .wg-chrome, .wg-hint { display: none !important; }
}

@media (min-width: 900px) {
  .wg-app-root { padding: 36px 24px 56px; display: flex; flex-direction: column; align-items: center; gap: 26px; }
  .wg-chrome { display: block; width: 100%; max-width: 920px; }
  .wg-chrome-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; }
  .wg-chrome-intro { max-width: 520px; display: flex; flex-direction: column; gap: 8px; }
  .wg-toolbar-group { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
  .wg-toolbar-label { font: 600 10.5px/1 Inter, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #9fb0bd; }
  .wg-toolbar { display: flex; gap: 6px; padding: 5px; background: #ece8df; border-radius: 14px; }
  .wg-frame { width: 402px; height: 812px; border-radius: 44px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.28), 0 0 0 10px #0c1c2b, 0 0 0 11px rgba(255,255,255,.06); }
  .wg-phone { height: 812px; }
  .wg-hint { display: block; max-width: 620px; margin: 0; text-align: center; font-size: 13px; line-height: 1.6; color: #cdd6dd; text-wrap: pretty; }
}
`;
