"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { siteOrigin } from "@/lib/seo";
import { CARD_KINDS, type CardKind, settingsProblem, type TrelloSettings } from "@/lib/trello";
import { readTrelloFresh, saveTrello, sendCard, trelloStoreAvailable } from "@/lib/trello-store";

export type ActionResult = { ok: boolean; message: string };

async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!trelloStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

function fromForm(form: FormData): TrelloSettings {
  return {
    key: String(form.get("key") ?? "").trim(),
    token: String(form.get("token") ?? "").trim(),
    listId: String(form.get("listId") ?? "").trim(),
    kinds: CARD_KINDS.map((k) => k.kind).filter((k) => form.get(`kind-${k}`) === "on"),
    ownerMemberId: String(form.get("ownerMemberId") ?? "").trim(),
    botMemberId: String(form.get("botMemberId") ?? "").trim(),
  };
}

export async function saveTrelloAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const next = fromForm(form);
  const problem = settingsProblem(next);
  if (problem) return { ok: false, message: problem };

  if (!(await saveTrello(next))) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  revalidatePath("/admin/settings/trello");
  return {
    ok: true,
    message: next.kinds.length
      ? "Saved. Send a test card to check Trello agrees — saving only stores what you typed."
      : "Saved. Nothing is being sent to Trello.",
  };
}

/**
 * Make Trello answer.
 *
 * SAVING IS NOT WORKING, and this screen must not pretend otherwise. Three
 * plausible-looking values can be stored and still fail: a token generated
 * against a different key, a list ID that is really a board ID, a token that
 * expired last month. The only way to know is to create a card and see.
 *
 * `prev` is what useActionState passes; a test ignores it.
 */
export async function testTrelloAction(prev: ActionResult | null): Promise<ActionResult> {
  void prev;
  const refused = await allowed();
  if (refused) return refused;

  const settings = await readTrelloFresh();
  const problem = settingsProblem(settings);
  if (problem) return { ok: false, message: problem };

  // The saved settings, not the boxes on screen — otherwise a passing test
  // would say nothing about what the site will actually do tonight.
  const kind: CardKind = settings.kinds[0] ?? "photo";
  const result = await sendCard(
    { ...settings, kinds: [kind] },
    { kind, about: "test card from the White Glove admin", siteUrl: siteOrigin()?.toString() },
  );
  return {
    ok: result.ok,
    message: result.ok ? "Trello made the card. Look at the top of your list — you can delete it." : result.message,
  };
}
