"use server";

import { revalidatePath } from "next/cache";
import { BUILT_IN_ASSUMPTIONS, type PlannerAssumptions } from "@/data/planner-assumptions";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { assumptionProblem } from "@/lib/planner-settings";
import { plannerStoreAvailable, resetAssumptions, saveAssumptions } from "@/lib/planner-settings-store";

export type ActionResult = { ok: boolean; message: string };

/**
 * Checked here as well as by the layout's gate: a server action is its own
 * door, and a page that refuses to render is not a page that refuses to act.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!plannerStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/**
 * A figure that did not arrive, or arrived as something that is not a number,
 * keeps what the site ships with rather than becoming NaN. A half-submitted
 * form must not be able to leave the planner dividing by nothing.
 */
function number(form: FormData, name: keyof PlannerAssumptions): number {
  const raw = text(form, name);
  const value = Number(raw);
  return raw !== "" && Number.isFinite(value) ? value : (BUILT_IN_ASSUMPTIONS[name] as number);
}

function time(form: FormData, name: keyof PlannerAssumptions): string {
  return text(form, name) || (BUILT_IN_ASSUMPTIONS[name] as string);
}

export async function savePlannerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const next: PlannerAssumptions = {
    dayStart: time(form, "dayStart"),
    dayEnd: time(form, "dayEnd"),
    lateFinish: time(form, "lateFinish"),
    stopMins: number(form, "stopMins"),
    keverMins: number(form, "keverMins"),
    detourFactor: number(form, "detourFactor"),
    transferMins: number(form, "transferMins"),
    townKmh: number(form, "townKmh"),
    ruralKmh: number(form, "ruralKmh"),
    regionalKmh: number(form, "regionalKmh"),
    motorwayKmh: number(form, "motorwayKmh"),
    freeHoursWorthMentioning: number(form, "freeHoursWorthMentioning"),
    gapHoursWorthMentioning: number(form, "gapHoursWorthMentioning"),
  };

  // The same check the screen runs while somebody types. Run again here because
  // the screen is a convenience and this is the door.
  const problem = assumptionProblem(next);
  if (problem) return { ok: false, message: problem };

  const saved = await saveAssumptions(next);
  if (saved.ok) revalidatePath("/admin/planner");
  return saved;
}

/**
 * `prev` is the previous result, which useActionState passes and this does not
 * need — putting the figures back does not depend on how the last attempt went.
 */
export async function resetPlannerAction(prev: ActionResult | null): Promise<ActionResult> {
  void prev;
  const refused = await allowed();
  if (refused) return refused;
  if (!(await resetAssumptions())) return { ok: false, message: "Could not put them back. Try again." };
  revalidatePath("/admin/planner");
  return { ok: true, message: "Every figure is back to what the site ships with." };
}
