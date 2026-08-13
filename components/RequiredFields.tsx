"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { looksUnanswered, unansweredMessage, type FieldLike } from "@/lib/required-fields";

/**
 * A required field must actually be required.
 *
 * The browser already refuses to submit a form with an empty `required` field.
 * Two things slip past that, and both of them look to a person like the form
 * quietly ignoring them:
 *
 *   1. A space counts as an answer. Typing " " into a required box satisfies
 *      the browser, and the form goes through with nothing in it.
 *   2. A select whose first option is a placeholder — "— choose —" — is only
 *      caught when that option's value is empty. When it is not, an unmade
 *      choice submits as if it were made.
 *
 * This listens on the way down, before any form's own handler runs, so a form
 * that does its own fetch is covered as well as one that posts. Nothing here
 * decides what is required; it only holds the page to what it already says.
 */

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Dates, numbers, checkboxes and radios are the browser's business — there is
// no whitespace in them to trim, and its own check is already right.
const TEXTUAL = new Set(["text", "search", "url", "tel", "email", "password", ""]);

function describe(control: Control): FieldLike {
  if (control instanceof HTMLSelectElement) {
    const chosen = control.selectedOptions[0];
    return {
      kind: "select",
      value: control.value,
      optionText: chosen?.textContent ?? "",
      nothingSelected: !chosen,
    };
  }
  const textual = control instanceof HTMLTextAreaElement || TEXTUAL.has(control.type);
  return { kind: textual ? "text" : "other", value: control.value };
}

export default function RequiredFields() {
  const path = usePathname() ?? "/";
  useEffect(() => {
    // Partner widgets inside /embed have their own required fields. Intercepting
    // submit here blocked Aviasales search and threw into the Next.js overlay.
    if (path.startsWith("/embed")) return;

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.noValidate) return;

      const controls = Array.from(form.querySelectorAll<Control>("[required]"));
      let firstBad: Control | null = null;

      for (const control of controls) {
        if (control.disabled) continue;
        const field = describe(control);
        if (looksUnanswered(field)) {
          control.setCustomValidity(unansweredMessage(field));
          firstBad ??= control;
        } else {
          control.setCustomValidity("");
        }
      }

      if (!firstBad) return;
      // Stop the form's own handler too, or it fetches anyway.
      event.preventDefault();
      event.stopPropagation();
      form.reportValidity();
      firstBad.focus();
    }

    // Clear the message as soon as they start fixing it, so it does not sit
    // there contradicting what is now in the box.
    function onInput(event: Event) {
      const control = event.target;
      if (
        (control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement) &&
        control.validationMessage
      ) {
        control.setCustomValidity("");
      }
    }

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("input", onInput, true);
    };
  }, [path]);

  return null;
}
