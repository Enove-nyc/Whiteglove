"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TripGroupMessage } from "@/lib/trip-group-store";
import { MAX_CHANNEL_LABEL, TRIP_CHAT_CHANNELS, type DefaultTripChatChannel, type TripChatChannel, type TripChatChannelInfo } from "@/lib/trip-chat-channels";

const DEFAULT_CHANNELS: TripChatChannelInfo[] = TRIP_CHAT_CHANNELS.map(({ id, label }) => ({ id, label }));
type ChatReply = { messages?: TripGroupMessage[]; member?: { id: string; name: string }; needsName?: boolean; error?: string; channels?: TripChatChannelInfo[]; channelGone?: boolean };
function LegacyChannelButtons({ channels, channel, onChange, onAdd }: { channels: TripChatChannelInfo[]; channel: TripChatChannel; onChange: (value: TripChatChannel) => void; onAdd?: () => void }) {
  return <div role="group" aria-label="Chat channels" className="flex flex-wrap gap-2 px-4 pt-4">
    {channels.map(item => <button key={item.id} type="button" aria-pressed={channel === item.id}
      onClick={() => onChange(item.id)}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${channel === item.id ? "border-[#15204A] bg-[#15204A] text-white" : "border-stone-300 bg-white text-[#15204A]"}`}>{item.label}</button>)}
    {onAdd ? <button type="button" onClick={onAdd} className="min-h-11 rounded-xl border border-dashed border-stone-400 px-3 py-2 text-sm font-medium text-[#15204A]">+ New channel</button> : null}
  </div>;
}
async function chatRequest(code: string, action: string, extra: Record<string, string> = {}): Promise<ChatReply> {
  const response = await fetch("/api/trip-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, action, ...extra }), cache: "no-store" });
  const data = await response.json() as ChatReply;
  if (!response.ok && !data.needsName) throw Object.assign(new Error(data.error || "Could not reach the trip chat."), { channelGone: Boolean(data.channelGone) });
  return data;
}
function LegacyLiveTripGroupChat({ code }: { code: string }) {
  const id = useId();
  const [channels, setChannels] = useState<TripChatChannelInfo[]>(DEFAULT_CHANNELS);
  const [channel, setChannel] = useState<TripChatChannel>("general");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [memberId, setMemberId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadChannels = useCallback(async () => {
    try {
      const data = await chatRequest(code, "channels");
      if (data.channels) setChannels(data.channels);
      if (data.member) setMemberId(data.member.id);
    } catch { /* the four standard channels still work */ }
  }, [code]);
  useEffect(() => { const first = window.setTimeout(() => void loadChannels(), 0); return () => clearTimeout(first); }, [loadChannels]);
  const current = channels.find(item => item.id === channel) ?? channels[0];
  async function addChannel() {
    if (busy || !label.trim()) return;
    setBusy(true); setError("");
    try {
      const data = await chatRequest(code, "add-channel", { label });
      if (data.channels) { setChannels(data.channels); const made = data.channels.find(item => item.label.toLowerCase() === label.trim().replace(/\s+/g, " ").toLowerCase()); if (made) setChannel(made.id); }
      if (data.needsName) setError("Join the conversation first, then add a channel.");
      else { setLabel(""); setAdding(false); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not add the channel."); }
    finally { setBusy(false); }
  }
  async function removeChannel() {
    if (busy || !current || !window.confirm(`Remove “${current.label}” and its messages for everyone on this trip?`)) return;
    setBusy(true); setError("");
    try { const data = await chatRequest(code, "remove-channel", { channel: current.id }); if (data.channels) setChannels(data.channels); setChannel("general"); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not remove the channel."); }
    finally { setBusy(false); }
  }
  return <div className="flex min-h-0 flex-1 flex-col">
    <LegacyChannelButtons channels={channels} channel={current.id} onChange={setChannel} onAdd={() => { setAdding(value => !value); setError(""); }} />
    {adding ? <form onSubmit={(event) => { event.preventDefault(); void addChannel(); }} className="mx-4 mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 text-[#15204A]">
      <div className="min-w-0 flex-1"><label htmlFor={`${id}-channel`} className="block text-sm font-semibold">New channel name</label>
        <input id={`${id}-channel`} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={MAX_CHANNEL_LABEL} placeholder="e.g. Day trip to Bellagio" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3" /></div>
      <button disabled={busy || !label.trim()} className="min-h-11 rounded-xl bg-[#15204A] px-4 text-white disabled:opacity-50">Add</button>
      <button type="button" onClick={() => setAdding(false)} className="min-h-11 px-3 underline">Cancel</button>
    </form> : null}
    {error ? <p role="alert" className="mx-4 mt-3 rounded-xl bg-white p-3 text-sm text-red-800">{error}</p> : null}
    {current.createdBy && current.createdBy === memberId ? <div className="px-4 pt-2"><button type="button" onClick={() => void removeChannel()} disabled={busy} className="min-h-11 text-sm text-stone-600 underline">Remove this channel</button></div> : null}
    <LegacyChannelTripGroupChat key={current.id} code={code} channel={current.id} label={current.label} draft={drafts[current.id] ?? ""}
      onJoined={(member) => { setMemberId(member.id); void loadChannels(); }}
      onGone={() => { setChannel("general"); void loadChannels(); }}
      onDraftChange={draft => setDrafts(previous => ({ ...previous, [current.id]: draft }))} />
  </div>;
}
function LegacyChannelTripGroupChat({ code, channel, label, draft, onDraftChange, onJoined, onGone }: { code: string; channel: TripChatChannel; label: string; draft: string; onDraftChange: (value: string) => void; onJoined: (member: { id: string; name: string }) => void; onGone: () => void }) {
  const id = useId();
  const [messages, setMessages] = useState<TripGroupMessage[]>([]);
  const [member, setMember] = useState<ChatReply["member"]>();
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");
  const cursor = useRef<string | undefined>(undefined);
  const joined = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const mutating = useRef(false);
  const request = useCallback((action: string, extra: Record<string, string> = {}) => chatRequest(code, action, { channel, ...extra }), [code, channel]);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const data = await request("read", cursor.current ? { after: cursor.current } : {});
      if (current !== sequence.current) return;
      setNeedsName(Boolean(data.needsName));
      joined.current = Boolean(data.member);
      if (data.member) setMember(data.member);
      if (data.messages) { setMessages(data.messages); cursor.current = data.messages.at(-1)?.id; }
      setError("");
    } catch (problem) { if (current === sequence.current) setError(problem instanceof Error ? problem.message : "Could not load messages."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [request]);
  const invalidate = useCallback(() => { ++sequence.current; }, []);
  // Every 10 seconds while a conversation is moving, easing off to once a
  // minute when it goes quiet — most of an open chat's life is quiet, and each
  // check is a request on the free plans this runs on. Any new message, a send
  // or coming back to the tab puts it straight back to 10 seconds.
  const quietSince = useRef(Date.now());
  const lastSeen = useRef<string | undefined>(undefined);
  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const delay = () => { const quiet = Date.now() - quietSince.current; return quiet < 60_000 ? 10_000 : quiet < 300_000 ? 30_000 : 60_000; };
    const poll = async () => {
      if (stopped) return;
      if (joined.current && !mutating.current && document.visibilityState === "visible" && navigator.onLine) {
        await refresh();
        if (cursor.current !== lastSeen.current) { lastSeen.current = cursor.current; quietSince.current = Date.now(); }
      }
      if (!stopped) timer = window.setTimeout(() => void poll(), delay());
    };
    const wake = () => { quietSince.current = Date.now(); window.clearTimeout(timer); timer = window.setTimeout(() => void poll(), 0); };
    timer = window.setTimeout(async () => { await refresh(); lastSeen.current = cursor.current; if (!stopped) timer = window.setTimeout(() => void poll(), delay()); }, 0);
    const onVisible = () => { if (document.visibilityState === "visible") wake(); };
    window.addEventListener("online", wake); document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; invalidate(); window.clearTimeout(timer); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh, invalidate]);
  async function join() {
    setBusy(true); setError(""); mutating.current = true;
    try { const data = await request("join", { name }); setMember(data.member); if (data.member) onJoined(data.member); setNeedsName(false); await refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not join the chat."); }
    finally { mutating.current = false; setBusy(false); }
  }
  async function send() {
    if (busy || !draft.trim()) return;
    const text = draft.trim(); setBusy(true); setError(""); mutating.current = true; ++sequence.current;
    try { const data = await request("send", { text }); if (data.needsName) { setNeedsName(true); return; } setMessages(data.messages ?? []); cursor.current = data.messages?.at(-1)?.id; quietSince.current = Date.now(); onDraftChange(""); }
    catch (problem) { if ((problem as { channelGone?: boolean }).channelGone) { onGone(); return; } setError(problem instanceof Error ? problem.message : "Your message was not sent. Try again."); }
    finally { mutating.current = false; setBusy(false); }
  }
  return <section className="flex min-h-0 flex-1 flex-col gap-3 p-4 text-[#15204A]" aria-labelledby={`${id}-heading`}>
    <div><h2 id={`${id}-heading`} className="text-lg font-semibold">{label}</h2><p className="mt-1 text-sm leading-6 text-stone-600">A conversation for everyone with this trip’s code. Your display name is chosen by you.</p></div>
    {loading ? <p role="status">Opening the conversation…</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-white p-3 text-sm text-red-800">{error} <button type="button" onClick={() => void refresh()} className="min-h-11 px-2 font-semibold underline">Try again</button></p> : null}
    {needsName ? <form onSubmit={(event) => { event.preventDefault(); void join(); }} className="rounded-2xl bg-white p-4">
      <label htmlFor={`${id}-name`} className="block text-sm font-semibold">Your name in this trip</label><input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="given-name" required className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 px-3" />
      <button disabled={busy || !name.trim()} className="mt-3 min-h-11 rounded-xl bg-[#15204A] px-5 text-white disabled:opacity-50">Join the conversation</button>
    </form> : member ? <>
      <div className="text-sm text-stone-600">Chatting as {member.name} <button type="button" onClick={() => { setName(member.name); setNeedsName(true); }} className="min-h-11 px-2 underline">Change name</button></div>
      <ol aria-label="Trip messages" className="flex flex-col gap-3">{messages.map((message) => <li key={message.id} className={`max-w-[92%] rounded-2xl px-4 py-3 ${message.memberId === member.id ? "self-end bg-[#15204A] text-white" : "self-start bg-white"}`}>
        <p className="text-xs font-semibold">{message.memberId === member.id ? "You" : message.name}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p><time dateTime={message.at} className="mt-1 block text-xs opacity-80">{new Date(message.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
      </li>)}</ol>
      {!messages.length && !loading ? <p className="text-sm text-stone-600">No messages yet. Start the conversation with your travel group.</p> : null}
      <p className="text-xs text-stone-600">Showing the latest 500 messages in this channel.</p>
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="sticky bottom-0 mt-auto rounded-2xl bg-white p-3">
        <label htmlFor={`${id}-message`} className="sr-only">Message your trip group</label><textarea id={`${id}-message`} value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength={2000} rows={2} disabled={busy} placeholder="Message your trip group…" className="min-h-20 w-full resize-y rounded-xl border border-stone-300 p-3 text-base" />
        <button disabled={busy || !draft.trim()} className="mt-2 min-h-11 rounded-xl bg-[#15204A] px-5 text-white disabled:opacity-50">{busy ? "Sending…" : "Send"}</button>
      </form>
    </> : null}
  </section>;
}

function ChannelButtons({ channel, onChange }: { channel: TripChatChannel; onChange: (value: TripChatChannel) => void }) {
  return <div role="group" aria-label="Chat channels" className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4">
    {TRIP_CHAT_CHANNELS.map(item => <button key={item.id} type="button" aria-pressed={channel === item.id}
      onClick={() => onChange(item.id)}
      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${channel === item.id ? "border-[#102F35] bg-[#102F35] text-white" : "border-stone-300 bg-white text-[#102F35]"}`}>{item.label}</button>)}
  </div>;
}
function LiveTripGroupChat({ code, family }: { code: string; family?: boolean }) {
  const [channel, setChannel] = useState<TripChatChannel>("general");
  const [drafts, setDrafts] = useState<Partial<Record<TripChatChannel, string>>>({});
  return <div className="flex min-h-0 flex-1 flex-col">
    <ChannelButtons channel={channel} onChange={setChannel} />
    <ChannelTripGroupChat key={channel} code={code} family={family} channel={channel} draft={drafts[channel] ?? ""}
      onDraftChange={draft => setDrafts(previous => ({ ...previous, [channel]: draft }))} />
  </div>;
}
function ChannelTripGroupChat({ code, family, channel, draft, onDraftChange }: { code: string; family?: boolean; channel: TripChatChannel; draft: string; onDraftChange: (value: string) => void }) {
  const id = useId();
  const [messages, setMessages] = useState<TripGroupMessage[]>([]);
  const [member, setMember] = useState<ChatReply["member"]>();
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");
  const label = TRIP_CHAT_CHANNELS.find(item => item.id === channel)!.label;
  const cursor = useRef<string | undefined>(undefined);
  const joined = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState("");
  const sequence = useRef(0);
  const mutating = useRef(false);
  const request = useCallback(async (action: string, extra: Record<string, string> = {}) => {
    const response = await fetch("/api/trip-group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, action, channel, ...extra }), cache: "no-store" });
    const data = await response.json() as ChatReply;
    if (!response.ok && !data.needsName) throw new Error(data.error || "Could not reach the trip chat.");
    return data;
  }, [code, channel]);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const data = await request("read", cursor.current ? { after: cursor.current } : {});
      if (current !== sequence.current) return;
      setNeedsName(Boolean(data.needsName));
      joined.current = Boolean(data.member);
      if (data.member) setMember(data.member);
      if (data.messages) { setMessages(data.messages); cursor.current = data.messages.at(-1)?.id; }
      setError("");
    } catch (problem) { if (current === sequence.current) setError(problem instanceof Error ? problem.message : "Could not load messages."); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [request]);
  const invalidate = useCallback(() => { ++sequence.current; }, []);
  useEffect(() => {
    const firstPoll = window.setTimeout(() => void refresh(), 0);
    const poll = () => { if (joined.current && !mutating.current && document.visibilityState === "visible" && navigator.onLine) void refresh(); };
    const timer = window.setInterval(poll, 15000);
    window.addEventListener("online", poll); document.addEventListener("visibilitychange", poll);
    return () => { invalidate(); clearTimeout(firstPoll); clearInterval(timer); window.removeEventListener("online", poll); document.removeEventListener("visibilitychange", poll); };
  }, [refresh, invalidate]);
  async function join() {
    setBusy(true); setError(""); mutating.current = true;
    try { const data = await request("join", { name }); setMember(data.member); setNeedsName(false); await refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not join the chat."); }
    finally { mutating.current = false; setBusy(false); }
  }
  async function send() {
    if (busy || !draft.trim()) return;
    const text = draft.trim(); setBusy(true); setError(""); mutating.current = true; ++sequence.current;
    try { const data = await request("send", { text }); if (data.needsName) { setNeedsName(true); return; } setMessages(data.messages ?? []); cursor.current = data.messages?.at(-1)?.id; onDraftChange(""); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Your message was not sent. Try again."); }
    finally { mutating.current = false; setBusy(false); }
  }
  async function report(messageId: string, reportKind: "message" | "traveler") {
    setError("");
    setReported("");
    try {
      await request("report", { messageId, reportKind });
      setReported("Report sent to White Glove for review.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The report could not be sent. Try again.");
    }
  }
  return <section className="flex min-h-0 flex-1 flex-col gap-3 p-4 text-[#102F35]" aria-labelledby={`${id}-heading`}>
    <div><h2 id={`${id}-heading`} className="text-lg font-semibold">{label}</h2><p className="mt-1 text-sm leading-6 text-stone-600">{family ? "Everyone invited to this trip can read and send messages here." : "A conversation for everyone with this trip’s code. Your display name is chosen by you."}</p></div>
    {reported && <p role="status" className="text-sm">{reported}</p>}
    {loading ? <p role="status">Opening the conversation…</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-white p-3 text-sm text-red-800">{error} <button type="button" onClick={() => void refresh()} className="min-h-11 px-2 font-semibold underline">Try again</button></p> : null}
    {needsName ? <form onSubmit={(event) => { event.preventDefault(); void join(); }} className="rounded-2xl bg-white p-4">
      <label htmlFor={`${id}-name`} className="block text-sm font-semibold">Your name in this trip</label><input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="given-name" required className="mt-2 min-h-11 w-full rounded-xl border border-stone-300 px-3" />
      <button disabled={busy || !name.trim()} className="mt-3 min-h-11 rounded-xl bg-[#102F35] px-5 text-white disabled:opacity-50">Join the conversation</button>
    </form> : member ? <>
      <div className="text-sm text-stone-600">Chatting as {member.name} {!family && <button type="button" onClick={() => { setName(member.name); setNeedsName(true); }} className="min-h-11 px-2 underline">Change name</button>}</div>
      <ol aria-label="Trip messages" className="flex flex-col gap-3">{messages.map((message) => <li key={message.id} className={`max-w-[92%] rounded-2xl px-4 py-3 ${message.memberId === member.id ? "self-end bg-[#102F35] text-white" : "self-start bg-white"}`}>
        <p className="text-xs font-semibold">{message.memberId === member.id ? "You" : message.name}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p><time dateTime={message.at} className="mt-1 block text-xs opacity-80">{new Date(message.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
        {family && message.memberId !== member.id && <details className="mt-1">
          <summary className="flex min-h-11 cursor-pointer items-center text-xs underline">Report</summary>
          <div className="flex flex-wrap gap-x-3">
            <button type="button" className="min-h-11 text-xs underline" onClick={() => void report(message.id, "message")}>Report message</button>
            <button type="button" className="min-h-11 text-xs underline" onClick={() => void report(message.id, "traveler")}>Report traveler</button>
          </div>
        </details>}
      </li>)}</ol>
      {!messages.length && !loading ? <p className="text-sm text-stone-600">No messages yet. Start the conversation with your travel group.</p> : null}
      <p className="text-xs text-stone-600">Showing the latest 500 messages in this channel.</p>
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="sticky bottom-0 mt-auto rounded-2xl bg-white p-3">
        <label htmlFor={`${id}-message`} className="sr-only">Message your trip group</label><textarea id={`${id}-message`} value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength={2000} rows={2} disabled={busy} placeholder="Message your trip group…" className="min-h-20 w-full resize-y rounded-xl border border-stone-300 p-3 text-base" />
        <button disabled={busy || !draft.trim()} className="mt-2 min-h-11 rounded-xl bg-[#102F35] px-5 text-white disabled:opacity-50">{busy ? "Sending…" : "Send"}</button>
      </form>
    </> : null}
  </section>;
}

function SampleTripGroupChat() {
  const [channel, setChannel] = useState<TripChatChannel>("general");
  const samples: Record<TripChatChannel, [string, string]> = {
    general: ["Let’s meet by the hotel entrance before we head out.", "On my way. I have the tickets in my wallet."],
    hotels: ["Our rooms are booked under the family name.", "I’ll ask reception about the connecting rooms."],
    flights: ["Our flight leaves at 10:30 tomorrow.", "Let’s meet at the check-in desk at 07:30."],
    plans: ["Shall we visit the gardens after breakfast?", "Sounds good. I’ll bring the walking map."],
  };
  return <section className="space-y-4 p-4 text-[#102F35]" aria-label="Sample trip group chat">
    <h2 className="text-lg font-semibold">Trip group chat</h2>
    <p className="text-sm leading-6 text-stone-600">Sample conversation between people on the same trip. Open your own trip code to send messages.</p>
    <ChannelButtons channel={channel} onChange={setChannel} />
    <h3 className="text-sm font-semibold">{TRIP_CHAT_CHANNELS.find(item => item.id === channel)!.label}</h3>
    <div className="rounded-2xl bg-white p-4"><p className="text-xs font-semibold">Miriam · Sample</p><p className="mt-1 text-sm leading-6">{samples[channel][0]}</p></div>
    <div className="ml-6 rounded-2xl bg-[#102F35] p-4 text-white"><p className="text-xs font-semibold">David · Sample</p><p className="mt-1 text-sm leading-6">{samples[channel][1]}</p></div>
  </section>;
}
export default function TripGroupChat({ code, preview = false, family }: { code?: string; preview?: boolean; family?: boolean }) {
  if (preview) return <SampleTripGroupChat />;
  if (!code) return null;
  return family ? <LiveTripGroupChat key={code} code={code} family /> : <LegacyLiveTripGroupChat key={code} code={code} />;
}
