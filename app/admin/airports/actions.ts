"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import {
  type AddedAirport,
  type AddedMetro,
  airportProblem,
  airportsIn,
  mergeAirports,
  metroProblem,
} from "@/lib/airport-admin";
import { airportStoreAvailable, readAirportEdits, writeAirportEdits } from "@/lib/airport-store";

export type ActionResult = { ok: boolean; message: string };

/**
 * Airports are the "directory" area. Checked here as well as by the layout's
 * gate: a server action is its own door, and a page that refuses to render is
 * not a page that refuses to act.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!airportStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const number = (form: FormData, name: string) => {
  const raw = text(form, name);
  return raw === "" ? Number.NaN : Number(raw);
};

export async function saveAirportAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const airport: AddedAirport = {
    code: text(form, "code").toUpperCase(),
    name: text(form, "name"),
    city: text(form, "city"),
    country: text(form, "country"),
    lat: number(form, "lat"),
    lng: number(form, "lng"),
    // Split on commas, because that is how somebody types a list.
    aliases: text(form, "aliases").split(",").map((a) => a.trim().toLowerCase()).filter(Boolean),
    cityCode: text(form, "cityCode").toUpperCase() || undefined,
    addedAt: new Date().toISOString(),
  };
  const problem = airportProblem(airport);
  if (problem) return { ok: false, message: problem };

  const edits = await readAirportEdits();
  // Saving one that is already here replaces it, so this screen is both "add"
  // and "correct" without a second form that could disagree with the first.
  const airports = edits.airports.some((a) => a.code.toUpperCase() === airport.code)
    ? edits.airports.map((a) => (a.code.toUpperCase() === airport.code ? airport : a))
    : [...edits.airports, airport];
  if (!(await writeAirportEdits({ ...edits, airports }))) return { ok: false, message: "That could not be saved." };
  revalidatePath("/admin/airports");
  return { ok: true, message: `${airport.code} saved.` };
}

export async function saveMetroAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const metro: AddedMetro = {
    code: text(form, "code").toUpperCase(),
    label: text(form, "label"),
    country: text(form, "country"),
    addedAt: new Date().toISOString(),
  };
  const edits = await readAirportEdits();
  // Counted against everything that will exist after the merge, not against
  // what the owner typed — the group is only useful if real airports point at
  // it, and those are set on the airports themselves.
  const willHold = airportsIn(metro.code, mergeAirports(edits.airports)).length;
  const problem = metroProblem(metro, willHold);
  if (problem) return { ok: false, message: problem };

  const metros = edits.metros.some((m) => m.code.toUpperCase() === metro.code)
    ? edits.metros.map((m) => (m.code.toUpperCase() === metro.code ? metro : m))
    : [...edits.metros, metro];
  if (!(await writeAirportEdits({ ...edits, metros }))) return { ok: false, message: "That could not be saved." };
  revalidatePath("/admin/airports");
  return { ok: true, message: `${metro.code} saved.` };
}

/**
 * Remove something the owner added.
 *
 * Only his own. A built-in airport cannot be removed here at all — it lives in
 * a file, and a form that appeared to delete one would be lying.
 */
export async function removeAirportAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const code = text(form, "code").toUpperCase();
  const kind = text(form, "kind");
  const edits = await readAirportEdits();
  const next =
    kind === "metro"
      ? { ...edits, metros: edits.metros.filter((m) => m.code.toUpperCase() !== code) }
      : { ...edits, airports: edits.airports.filter((a) => a.code.toUpperCase() !== code) };
  if (!(await writeAirportEdits(next))) return { ok: false, message: "That could not be saved." };
  revalidatePath("/admin/airports");
  return { ok: true, message: `${code} removed. Any built-in entry for it is back.` };
}
