import { cookies } from "next/headers";
import { currentAdmin } from "@/lib/admin-current";
import { accountCookieName, getAccountRecord, readSessionEmail } from "@/lib/account-store";

/** A named administrator cannot become the owner by deleting their who-cookie. */
export async function accountInvitationOwner(): Promise<string | null> {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || !(await currentAdmin()).identity) return null;
  const jar = await cookies();
  const email = readSessionEmail(jar.get(accountCookieName())?.value);
  if (!email || email.trim().toLowerCase() !== owner) return null;
  const account = await getAccountRecord(email);
  return account?.verifiedAt ? owner : null;
}
