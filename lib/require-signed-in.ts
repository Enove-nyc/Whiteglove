import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";

/**
 * A server-page guard: a signed-out visitor is sent to the sign-in door with
 * the way back carried along, so after signing in they land where they were
 * headed.
 *
 * ONE DEFINITION OF SIGNED IN, and it is app/account/page.tsx's: a valid
 * session cookie counts even when the saved record cannot be read this moment,
 * so a store hiccup never locks somebody out of their own planner. Kept here so
 * the planning pages share exactly that rule rather than three near-copies of
 * it drifting apart.
 *
 * `next` is a path on this site (leading slash), query and all — it becomes the
 * ?next= the login page reads back, so a "add Rome to a trip" link survives the
 * round trip through sign-in.
 */
export async function requireSignedIn(next: string): Promise<void> {
  if (!(await isSignedIn())) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
}

/**
 * The same question without the redirect, for a page that is OPEN but shows
 * more to somebody signed in — /packing, which gives every visitor a starter
 * list and a member's own trip list in its place. Sharing the rule is the
 * point: a page that decides "signed in" its own way is a page that disagrees
 * with the guard sooner or later.
 */
export async function isSignedIn(): Promise<boolean> {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  return Boolean(account) || Boolean(readSessionEmail(cookie));
}
