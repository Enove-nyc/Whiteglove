/**
 * The features an account is for, and what to say when somebody signed out
 * presses one.
 *
 * NOTHING IS HIDDEN ANY MORE, and that is the whole point of this file. The
 * itinerary planner and My Route were in the menu ONLY when somebody was signed
 * in — so a visitor who had not signed in never learned they existed, and
 * therefore had no reason to make an account. A feature nobody can see is a
 * feature nobody asks for.
 *
 * SO THE BUTTONS ARE ALWAYS THERE. Pressing one signed out opens a note saying
 * what it is and what an account adds.
 *
 * THEY CAN STILL OPEN THE PLANNER without an account and type into it. Saving
 * the trip — adding a stop, keeping a route, coming back on another device —
 * is what needs the account. The note used to say the trip lived in this
 * browser; that is no longer offered, so the note says the true thing.
 */

export type GatedFeature = {
  key: string;
  /** What the button says. */
  label: string;
  href: string;
  /**
   * True only when the page can do NOTHING without an account. False means it
   * can be opened and used; saving still needs an account.
   */
  needsAccount: boolean;
  /** What the feature is, for somebody who has never seen it. */
  what: string;
  /** What signing in adds. Read only when `needsAccount` is false. */
  accountAdds: string;
};

export const GATED_FEATURES: readonly GatedFeature[] = [
  {
    key: "itinerary",
    label: "Itinerary planner",
    href: "/itinerary",
    needsAccount: false,
    what: "Build your trip day by day — flights, hotels and every stop — with driving times worked out and a printable copy at the end.",
    accountAdds:
      "Start planning freely. Create an account when you are ready to save your trip and access it on any device.",
  },
  {
    key: "my-route",
    label: "My Route",
    href: "/my-route",
    needsAccount: false,
    what: "The kevarim and places you have saved, in the order you will drive them, with the distance between each one.",
    accountAdds:
      "Start planning freely. Create an account when you are ready to save your route and access it on any device.",
  },
] as const;

export function featureFor(key: string): GatedFeature | undefined {
  return GATED_FEATURES.find((f) => f.key === key);
}

export type Prompt = {
  title: string;
  /** Two paragraphs: what it is, then what an account changes. */
  body: [string, string];
  /** Whether "carry on without signing in" is offered — and it must be, unless it truly cannot work. */
  canContinue: boolean;
  continueLabel: string;
};

/** What to put in the note. Never null; every feature has words. */
export function promptFor(feature: GatedFeature): Prompt {
  if (feature.needsAccount) {
    return {
      title: "You need to be signed in for this",
      body: [feature.what, "This one cannot work without an account, so there is nothing to see until you are signed in."],
      canContinue: false,
      continueLabel: "",
    };
  }
  return {
    title: `${feature.label} — you can use this now`,
    body: [feature.what, feature.accountAdds],
    canContinue: true,
    continueLabel: "Continue without saving",
  };
}

/**
 * Where to send somebody to sign in so they land back on the feature.
 *
 * The feature's own address, not the page they were on: they pressed a button
 * asking to go somewhere, and signing in should finish that journey rather than
 * return them to where they started and make them press it again.
 */
export function signInTo(feature: GatedFeature): string {
  return `/login?next=${encodeURIComponent(feature.href)}`;
}

/**
 * ONE LINK, NOT TWO. There is no separate sign-up page — /login opens on "Sign
 * up" with a toggle to "Sign in" — so a second button labelled "Create an
 * account" would go to exactly the same place and read as a different door.
 */
export const SIGN_IN_LABEL = "Sign in or create an account";
