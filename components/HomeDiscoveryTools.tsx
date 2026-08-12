"use client";

import { useState, type ReactNode } from "react";
import DestinationSearch from "@/components/DestinationSearch";
import StaySearchForm from "@/components/StaySearchForm";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import { SITE_SEARCH_LABEL, SITE_SEARCH_NOTE } from "@/lib/site-search-labels";

/**
 * Homepage Search / Ask / Plan.
 *
 * Three intentions, one expanded panel. Tools stay mounted (hidden) so typed
 * answers and form fields survive switching in the same visit — that is not a
 * saved trip.
 */

type ToolId = "search" | "ask" | "plan";

const TOOLS: Array<{
  id: ToolId;
  label: string;
  title: string;
  body: string;
  action: string;
}> = [
  {
    id: "search",
    label: "Search",
    title: "Search White Glove",
    body: "Looking for a particular destination, restaurant, place to stay, kever, cemetery, or town? Search everything published on White Glove.",
    action: "Search the site",
  },
  {
    id: "ask",
    label: "Ask",
    title: "Ask the White Glove assistant",
    body: "Not sure where to go or how to plan it? Ask for destination ideas, kosher travel guidance, Shabbos planning, or help shaping an itinerary.",
    action: "Ask the travel assistant",
  },
  {
    id: "plan",
    label: "Plan",
    title: "Start planning a trip",
    body: "Know roughly where and when you want to travel? Enter your destination and dates to begin planning.",
    action: "Start planning",
  },
];

function ToolIcon({ id }: { id: ToolId }) {
  if (id === "search") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
        <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "ask") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 18.5V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8v6.4A2.8 2.8 0 0 1 16.2 17H9l-4 3.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="6" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 4.5v3M16 4.5v3M4.5 10.5h15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default function HomeDiscoveryTools() {
  // Plan is the primary vacation-planning action; Search and Ask stay one press away.
  const [tool, setTool] = useState<ToolId>("plan");

  return (
    <div className="mt-8 max-w-5xl">
      <div
        role="tablist"
        aria-label="Search, ask, or plan"
        className="grid gap-3 sm:grid-cols-3"
      >
        {TOOLS.map((item) => {
          const selected = tool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`home-tool-${item.id}`}
              id={`home-tool-tab-${item.id}`}
              onClick={() => setTool(item.id)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                selected
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white shadow-[0_14px_30px_rgba(23,45,82,.16)]"
                  : "border-[var(--gold-light)] bg-[var(--surface)] text-[var(--navy)] hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
              }`}
            >
              <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${selected ? "text-[var(--gold-light)]" : "text-[var(--gold-ink)]"}`}>
                <ToolIcon id={item.id} />
                {item.label}
              </span>
              <span className="mt-2 block font-[family-name:var(--font-display)] text-xl leading-tight">{item.title}</span>
              <span className={`mt-2 block text-sm leading-6 ${selected ? "text-slate-200" : "text-stone-600"}`}>{item.body}</span>
              <span className={`mt-3 inline-flex min-h-11 items-center text-sm font-semibold ${selected ? "text-[var(--gold-light)]" : "text-[var(--navy)]"}`}>
                {item.action} →
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <Panel id="search" active={tool === "search"}>
          <div className="rounded-2xl border border-[var(--navy)]/15 bg-white p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{SITE_SEARCH_LABEL}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{SITE_SEARCH_NOTE}</p>
            <div className="mt-4">
              <DestinationSearch compact showChrome={false} id="home-site-search" />
            </div>
          </div>
        </Panel>

        <Panel id="ask" active={tool === "ask"}>
          <TravelAssistantBox embedded />
        </Panel>

        <Panel id="plan" active={tool === "plan"}>
          <StaySearchForm id="hero" submitLabel="Start planning" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ id, active, children }: { id: ToolId; active: boolean; children: ReactNode }) {
  // Keep every tool mounted so in-session drafts survive tab switches.
  return (
    <div
      id={`home-tool-${id}`}
      role="tabpanel"
      aria-labelledby={`home-tool-tab-${id}`}
      hidden={!active}
      className={active ? "block" : "hidden"}
    >
      {children}
    </div>
  );
}
