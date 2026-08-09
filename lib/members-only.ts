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
 * AND THE NOTE HAS TO BE TRUE. "You need to be logged in for this" is the
 * natural thing to write and it would be **false for both of these**: the
 * planner and My Route work perfectly well signed out, keeping everything in
 * this browser. Saying otherwise would turn away the exact person it is meant
 * to attract, and the first time they found out it worked anyway, nothing else
 * the site said would be worth much either.
 *
 * So the note says the true thing — the trip lives only in this browser until
 * there is an account to keep it in — and offers to carry on without one.
 * `needsAccount` is here for the day something really cannot work without an
 * account; that one gets the blunt sentence, honestly.
 */

export type GatedFeature = {
  key: string;
  /** What the button says. */
  label: string;
  href: string;
  /**
   * True only when the page can do NOTHING without an account. False means it
   * works signed out and an account adds something — which is both of today's.
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
      "Without an account it is kept in this browser only: clear your history, or pick up your phone, and it is not there. Signed in, it follows you between devices and you can share it with whoever is travelling with you.",
  },
  {
    key: "my-route",
    label: "My Route",
    href: "/my-route",
    needsAccount: false,
    what: "The kevarim and places you have saved, in the order you will drive them, with the distance between each one.",
    accountAdds:
      "Without an account the list is kept in this browser only. Signed in, it is on your phone when you are standing at the gate — which is the moment it is actually for.",
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
    continueLabel: "Carry on without an account",
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
