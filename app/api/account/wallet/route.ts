import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, readSessionEmail } from "@/lib/account-store";
import {
  FILE_ID_SHAPE, MAX_WALLET_FILE_BYTES, SCOPE_SHAPE, WALLET_KINDS,
  cleanFileName, deleteWalletFile, listWalletFiles, readWalletFile, saveWalletFile, sniffWalletType, walletAvailable,
} from "@/lib/account-wallet-store";
import { rateLimit, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * The signed-in traveller's own wallet files, kept on the account so they
 * reach a second phone. Private to that account: the trip code alone opens
 * nothing here, and the account is read from the session cookie, never from
 * anything the request names.
 */
function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
async function signedInEmail(): Promise<string | null> {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  if (!cookie) return null;
  const account = await getCurrentAccountData(cookie);
  return account?.email || readSessionEmail(cookie) || null;
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  const id = request.nextUrl.searchParams.get("id");
  if (!SCOPE_SHAPE.test(scope) || (id !== null && !FILE_ID_SHAPE.test(id))) return reply({ error: "Open your trip again." }, 400);
  if (!walletAvailable()) return reply({ available: false });
  const email = await signedInEmail();
  if (!email) return reply({ available: true, signedIn: false });
  try {
    if (id === null) return reply({ available: true, signedIn: true, files: (await listWalletFiles(email, scope)) ?? [] });
    const found = await readWalletFile(email, scope, id);
    if (!found) return reply({ error: "That file is no longer in your account." }, 404);
    return new NextResponse(found.body, { headers: {
      "Content-Type": found.file.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(found.file.name)}`,
    } });
  } catch { return reply({ error: "Your account wallet could not be reached. Please try again." }, 503); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Please open your trip again." }, 403);
  if (!walletAvailable()) return reply({ error: "Saving to your account is not available right now." }, 503);
  const email = await signedInEmail();
  if (!email) return reply({ error: "Log in to keep wallet files on your account." }, 401);
  const limited = await rateLimit(`wallet-upload:${email}`, { limit: 30, windowSeconds: 3600 });
  if (!limited.ok) return reply({ error: tooManyMessage(limited.retryAfter) }, 429);
  const scope = request.headers.get("x-wallet-scope") ?? "";
  const id = request.headers.get("x-wallet-id") ?? "";
  const kind = decodeURIComponent(request.headers.get("x-wallet-kind") ?? "");
  let name = "";
  try { name = cleanFileName(decodeURIComponent(request.headers.get("x-wallet-name") ?? "")); } catch { name = "Travel document"; }
  const savedAt = request.headers.get("x-wallet-saved-at") ?? "";
  if (!SCOPE_SHAPE.test(scope) || !FILE_ID_SHAPE.test(id)) return reply({ error: "Open your trip again." }, 400);
  if (!(WALLET_KINDS as readonly string[]).includes(kind)) return reply({ error: "Choose a document type." }, 400);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_WALLET_FILE_BYTES) return reply({ error: "Choose a file smaller than 15 MB." }, 413);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return reply({ error: "Choose a file that contains a document." }, 400);
  if (body.byteLength > MAX_WALLET_FILE_BYTES) return reply({ error: "Choose a file smaller than 15 MB." }, 413);
  const type = sniffWalletType(new Uint8Array(body.slice(0, 12)));
  if (!type) return reply({ error: "Choose a PDF, JPG, PNG or WebP image." }, 415);
  const when = Number.isNaN(Date.parse(savedAt)) ? new Date().toISOString() : new Date(savedAt).toISOString();
  try {
    const result = await saveWalletFile(email, scope, { id, name, kind, type, savedAt: when }, body);
    return "error" in result ? reply(result, 409) : reply({ ok: true });
  } catch { return reply({ error: "The file was not saved to your account. Please try again." }, 503); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Please open your trip again." }, 403);
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!SCOPE_SHAPE.test(scope) || !FILE_ID_SHAPE.test(id)) return reply({ error: "Open your trip again." }, 400);
  const email = await signedInEmail();
  if (!email) return reply({ error: "Log in to manage your account wallet." }, 401);
  try { return (await deleteWalletFile(email, scope, id)) ? reply({ ok: true }) : reply({ error: "Not available right now." }, 503); }
  catch { return reply({ error: "The file could not be removed. Please try again." }, 503); }
}
