"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";

const TravelAssistantBox = dynamic(() => import("@/components/TravelAssistantBox"));
const OpenAssistant = createContext<(question?: string) => boolean>(() => false);

export function useOpenTravelAssistant() {
  return useContext(OpenAssistant);
}

export default function TravelAssistantPopup({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [request, setRequest] = useState<{ id: number; path: string; question: string }>();
  const inApp = pathname === "/app" || /^\/(i|t)\/[^/]+\/app\/?$/.test(pathname);
  const inTrip = inApp && pathname !== "/app";

  function open(question = "") {
    const dialog = dialogRef.current;
    if (!dialog || pathname === "/assistant") return false;
    if (!dialog.open) dialog.showModal();
    setRequest((current) =>
      current?.path === pathname && !question
        ? current
        : { id: (current?.id ?? 0) + 1, path: pathname, question },
    );
    return true;
  }

  return (
    <OpenAssistant.Provider value={open}>
      {children}
      {inApp && (
        <button
          type="button"
          aria-label="Ask the AI travel assistant"
          aria-haspopup="dialog"
          title="Ask AI"
          onClick={() => open()}
          className={`fixed right-4 z-[var(--wg-z-popover)] grid size-11 place-items-center rounded-full border border-[var(--gold-light)] bg-[var(--navy)] text-white shadow-lg hover:bg-[var(--navy-deep)] ${inTrip ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"}`}
        >
          <Icon name="sparkle" className="h-5 w-5" />
        </button>
      )}
      <dialog
        key={pathname}
        ref={dialogRef}
        aria-labelledby="travel-assistant-heading"
        className="fixed inset-auto bottom-3 right-3 m-0 max-h-[calc(100dvh-1.5rem)] w-[min(30rem,calc(100%-1.5rem))] max-w-none overflow-y-auto overscroll-contain rounded-2xl border border-[var(--gold-light)] bg-[#FAF8F3] p-0 text-[var(--navy)] shadow-2xl backdrop:bg-black/30 sm:bottom-5 sm:right-5"
        onClick={(event) => {
          const dialog = event.currentTarget;
          if (event.target !== dialog) return;
          const box = dialog.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX >= box.right || event.clientY < box.top || event.clientY >= box.bottom) dialog.close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--gold-light)] bg-[#FAF8F3] px-4 py-2">
          <h2 id="travel-assistant-heading" className="text-base font-semibold">AI travel assistant</h2>
          <button type="button" aria-label="Close AI travel assistant" className="grid size-11 place-items-center rounded-full text-2xl hover:bg-[var(--cream-deep)]" onClick={() => dialogRef.current?.close()}>×</button>
        </div>
        {request?.path === pathname && <TravelAssistantBox key={request.id} embedded labelledOutside initialAsk={request.question} clearQuestionFromUrl={false} />}
      </dialog>
    </OpenAssistant.Provider>
  );
}

export function TravelAssistantForm({ children, className }: { children: ReactNode; className: string }) {
  const open = useOpenTravelAssistant();
  return (
    <form
      action="/assistant"
      method="get"
      className={className}
      onSubmit={(event) => {
        const question = String(new FormData(event.currentTarget).get("ask") ?? "").trim();
        if (question && open(question)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
