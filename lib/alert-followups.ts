/**
 * Who a follow-up may go to, and whether it is allowed to go out.
 *
 * SIGNUP IS NOT A LICENCE TO INVENT. The capture form already exists; what
 * was missing is the send. A follow-up has to be about something that
 * happened — a destination that is on the site, a programme that is on
 * record — written by the owner, not generated. An empty subject or body is
 * refused rather than filled in.
 *
 * Unsubscribed addresses never appear in the recipient list, even if they
 * are still in the store. Consent is required at signup; this module does
 * not re-ask, and it does not send to anyone who has since left.
 */

import { vacationDestinations } from "@/data/vacation-destinations";
import { isAlertTopic, type AlertSignup, type AlertTopic } from "@/lib/email-alerts";

export type FollowupInput = {
  topic: unknown;
  subject: string;
  body: string;
  href?: string;
  destinationSlug?: string;
};

export function followupProblem(input: FollowupInput): string | null {
  if (!isAlertTopic(input.topic)) return "Choose a topic people actually signed up for.";
  if (!input.subject.trim()) return "Write a subject. An empty one would be invented.";
  if (!input.body.trim()) return "Write what happened. An empty note is not a follow-up.";

  const href = input.href?.trim() ?? "";
  if (href) {
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("://")) {
      return "The link has to be a page on this site.";
    }
  }

  const slug = input.destinationSlug?.trim() ?? "";
  if (input.topic === "destination_updates" && !slug) {
    return "Name the destination this is about.";
  }
  if (slug && !vacationDestinations.some((destination) => destination.slug === slug)) {
    return "That destination is not on the published list.";
  }
  return null;
}

/**
 * Active, consented signups that asked for this topic.
 *
 * A destination slug narrows the list to people who named that place.
 * Unsubscribed records are out even if the caller forgot to drop them.
 */
export function recipientsFor(
  signups: readonly AlertSignup[],
  opts: { topic: AlertTopic; destinationSlug?: string },
): AlertSignup[] {
  const slug = opts.destinationSlug?.trim() ?? "";
  return signups.filter((signup) => {
    if (signup.unsubscribedAt) return false;
    if (!signup.consentedAt) return false;
    if (!signup.topics.includes(opts.topic)) return false;
    if (
      slug &&
      (opts.topic === "destination_updates" || opts.topic === "searched_destination")
    ) {
      return (
        signup.destinationSlug === slug ||
        signup.destinationQuery?.trim().toLowerCase() === slug.toLowerCase()
      );
    }
    return true;
  });
}
