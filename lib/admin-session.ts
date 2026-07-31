import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Who is signed into the admin.
 *
 * Until now: nobody in particular. Signing in meant typing one shared password
 * and receiving one shared cookie, identical for every person who has ever
 * held it. The admin could not tell the owner from a helper, the sign-in log
 * recorded "admin code" and nothing else, and every screen was open to
 * everyone who had the password.
 *
 * That also made the team screen's own promise untrue. It grants a person
 * `admin: true`, and the account page then offers them a link through to the
 * admin — which the middleware bounced straight to a password prompt they had
 * never been given the password for. The grant did nothing.
 *
 * So an admin account can now mint the admin session itself, and the session
 * carries WHO. The shared password still works and still carries nobody; it is
 * labelled as what it is rather than quietly treated as a person.
 *
 * WHY A SECOND COOKIE rather than putting the email in the first one: the
 * middleware compares `white_glove_admin` to one expected value on the edge,
 * where node's crypto is not available. Leaving that cookie exactly as it was
 * keeps the gate untouched and unbroken; this sits beside it and is read only
 * where identity is wanted.
 *
 * It is signed. An unsigned name cookie would let anybody who already holds
 * the shared password relabel themselves as the owner in the log.
 */

export const ADMIN_WHO_COOKIE = "white_glove_admin_who";

function secret(): string | null {
  const configured = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "white-glove-development-secret";
  return null;
}

/** `<email>.<signature>`, or null when this deployment cannot sign anything. */
export function signWho(email: string): string | null {
  const key = secret();
  const value = email.trim().toLowerCase();
  if (!key || !value) return null;
  const mac = createHmac("sha256", key).update(`white-glove:who:${value}`).digest("base64url");
  return `${Buffer.from(value).toString("base64url")}.${mac}`;
}

/** The email inside a who-cookie, or null when it was not signed by us. */
export function readWho(cookieValue?: string): string | null {
  if (!cookieValue) return null;
  const [encoded, mac] = cookieValue.split(".");
  if (!encoded || !mac) return null;
  let email: string;
  try {
    email = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = signWho(email)?.split(".")[1];
  if (!expected || expected.length !== mac.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? email : null;
}

export type AdminIdentity =
  /** Signed in as themselves. */
  | { how: "account"; email: string }
  /** Signed in with the shared password. Nobody in particular. */
  | { how: "code" };

/**
 * Who this admin session belongs to.
 *
 * Called only where identity matters — the header, the sign-in log. The gate
 * itself is unchanged: holding a valid admin cookie is still what gets you in,
 * whichever way you came by it.
 */
export function adminIdentity(whoCookie: string | undefined, hasAdminCookie: boolean): AdminIdentity | null {
  if (!hasAdminCookie) return null;
  const email = readWho(whoCookie);
  return email ? { how: "account", email } : { how: "code" };
}

/** How to name them on screen. */
export function describeAdmin(identity: AdminIdentity | null): string {
  if (!identity) return "Not signed in";
  if (identity.how === "account") return identity.email;
  return "Signed in with the shared password";
}
