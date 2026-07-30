"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps the keyboard inside an open dialog, and gives it back afterwards.
 *
 * A modal that does not trap focus is a modal only for people using a mouse.
 * Tab from the last field and you are behind the overlay, on the page the
 * dialog is covering, tabbing through controls you cannot see. And when the
 * dialog closes, focus has to return to whatever opened it — otherwise it
 * lands back at the top of the document and the next Tab starts the page over.
 *
 * Returns the ref to put on the dialog's own element.
 *
 * @param active whether the dialog is open
 * @param onEscape called when Escape is pressed, so the dialog can close
 *   itself. Escape is the standard way out of a modal and the only one a
 *   keyboard user can reach without hunting for the close button.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T>(null);
  // Read inside the effect, not in the render, so it is the element that was
  // focused when the dialog opened rather than whatever is focused now.
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const box = ref.current;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = () => Array.from(box?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Move into the dialog, so the first Tab goes to its second control rather
    // than out of it.
    const first = focusable()[0];
    if (first) first.focus();
    else box?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscape?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const current = document.activeElement;
      // Wrap at both ends, and catch the case where focus has somehow escaped
      // the dialog already.
      if (event.shiftKey && (current === firstItem || !box?.contains(current))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (current === lastItem || !box?.contains(current))) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      returnTo.current?.focus();
    };
  }, [active, onEscape]);

  return ref;
}
