"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DestinationSearch from "@/components/DestinationSearch";
import { isClientCodeAppView } from "@/components/SiteAssistant";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useOnValueChange } from "@/components/useOnValueChange";

/**
 * The site's own search, from any page, without reaching for the mouse.
 *
 * IT ADDS NOTHING TO THE PAGE. There is no new button, no bar, no hint strip —
 * the header already carries a search icon and the phone bar already carries
 * Search, and a third door to the same room would be furniture. This is a
 * shortcut to what is already there: press "/" or ⌘K and the box opens over
 * whatever you were reading, Escape puts it away.
 *
 * NOT WHILE YOU ARE TYPING. A slash inside a form field is a slash: somebody
 * writing an address, a note or a message must be able to type one without the
 * page taking it as a command. So the shortcut is ignored whenever focus is in
 * a field, and ⌘K is left alone in a field too — the browser's own bindings are
 * not this component's to take.
 *
 * IT SEARCHES THE ONE INDEX. DestinationSearch is the same control the front
 * page opens with and the header carries, so a result here is the result
 * anywhere: there is no second ranking to keep in step, which is how a
 * "command centre" quietly becomes a different search with different answers.
 */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const box = useFocusTrap<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable === true;
      if (typing) return;

      const shortcut =
        (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) ||
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
      if (!shortcut) return;

      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A page change closes it: the search has done its job, and a panel left open
  // over the page somebody just asked for is in the way. Adjusted during
  // render rather than in an effect, so the paint that reaches the screen has
  // already closed it — and it is this component's own state, which is the
  // only kind that may be adjusted this way.
  useOnValueChange(pathname, () => setOpen(false));

  // The client's own app is one trip on a phone, not the website. Same rule the
  // assistant follows, and the same helper, so the two cannot disagree.
  if (isClientCodeAppView(pathname)) return null;
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--wg-z-modal)] flex items-start justify-center bg-[var(--navy)]/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label="Search White Glove"
        className="w-full max-w-2xl rounded-2xl border border-[var(--gold)] bg-[var(--cream)] p-4 shadow-[0_24px_60px_rgba(13,25,45,.35)] sm:p-5"
      >
        {/* compact, because the hero's version carries a mt-12 meant for a
            headline that is not here — in a panel it reads as a gap somebody
            forgot to fill. */}
        <DestinationSearch id="search-palette" autoFocus compact />
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Press <kbd className="font-semibold text-[var(--navy)]">Esc</kbd> to close.
        </p>
      </div>
    </div>
  );
}
