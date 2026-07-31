import { cookies } from "next/headers";
import { adminAreasFor } from "@/lib/admin-roles";
import type { AdminArea } from "@/lib/admin-permissions";
import { ADMIN_WHO_COOKIE, adminIdentity, type AdminIdentity } from "@/lib/admin-session";
import { isValidAccessToken } from "@/lib/secure-access";

/**
 * Who is in the admin right now, and what they may use.
 *
 * One place, because three of them would drift. The layout wants it to draw
 * the navigation, every area gate wants it to decide, and they must not be able
 * to disagree — a nav that hides a screen the gate would have allowed is only
 * confusing, but a nav that offers one the gate refuses is a broken product.
 *
 * SIGNED IN WITH THE SHARED PASSWORD MEANS UNRESTRICTED. The shared password is
 * the owner's own way in; it carries no name, so there is nobody to look up and
 * nothing to narrow. Narrowing it would lock the owner out of his own site the
 * first time he typed the code instead of signing in.
 */
export async function currentAdmin(): Promise<{ identity: AdminIdentity | null; areas: AdminArea[] | null }> {
  const jar = await cookies();
  const identity = adminIdentity(
    jar.get(ADMIN_WHO_COOKIE)?.value,
    isValidAccessToken("admin", jar.get("white_glove_admin")?.value),
  );
  const areas = identity?.how === "account" ? await adminAreasFor(identity.email) : null;
  return { identity, areas };
}
