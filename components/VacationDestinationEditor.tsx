"use client";

import { useActionState } from "react";
import type { Photo } from "@prisma/client";
import PhotoManager from "@/components/PhotoManager";
import { SEASONS, TRIP_THEMES } from "@/data/vacation-destinations";
import type { VacationDestinationItem } from "@/lib/vacation-destinations-view";
import {
  type ActionResult,
  discardEditsAction,
  saveDestinationAction,
  setVisibleAction,
} from "@/app/admin/vacation-destinations/actions";

/**
 * Editing one holiday destination.
 *
 * WHAT MAKES THIS DIFFERENT FROM EVERY OTHER EDITOR ON THE SITE: an empty box
 * does not mean an empty field. The twenty destinations the site shipped with
 * are written in code, and this screen lays the owner's version over the top
 * of that, field by field. So clearing a box hands the field back to the
 * original text rather than blanking it on the site — and the form says so,
 * next to the boxes it is true of, because it is not what a form usually does.
 *
 * Each box is pre-filled with what the page currently says, whether that came
 * from the file or from an earlier edit. Saving what is already there is
 * therefore harmless: it writes the same words back.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const hintClass = "mt-1 block text-xs text-stone-400";

function Field({
  label,
  name,
  defaultValue,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={captionClass}>{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={inputClass} />
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  hint,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className={captionClass}>{label}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? ""} className={inputClass} />
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  );
}

function Checks({
  label,
  name,
  options,
  checked,
  hint,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  checked: readonly string[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className={captionClass}>{label}</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-[var(--navy)]">
            <input type="checkbox" name={name} value={option.value} defaultChecked={checked.includes(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
      {hint && <span className={hintClass}>{hint}</span>}
    </fieldset>
  );
}

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p className={`mt-3 text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`} role="status">
      {state.message}
    </p>
  );
}

export default function VacationDestinationEditor({
  destination,
  hidden,
  hasRow,
  builtIn,
  photos,
}: {
  destination: VacationDestinationItem;
  hidden: boolean;
  /** True once anything at all has been saved against this destination. */
  hasRow: boolean;
  /** True when the site shipped with it, which changes what "discard" means. */
  builtIn: boolean;
  photos: Photo[];
}) {
  const [saved, save, saving] = useActionState(saveDestinationAction, null);
  const [visibility, setVisible, changingVisibility] = useActionState(setVisibleAction, null);
  const [discarded, discard, discarding] = useActionState(discardEditsAction, null);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{destination.name}</h2>
            <p className="mt-1 text-sm text-stone-500">
              /destinations/{destination.slug}
              {builtIn ? " · shipped with the site" : " · you added this"}
              {hidden && " · hidden from visitors"}
            </p>
          </div>
          <a
            href={`/destinations/${destination.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]"
          >
            View the page ↗
          </a>
        </div>

        {builtIn && (
          <p className="mt-4 rounded-lg border border-[var(--gold-light)] bg-[var(--cream)] p-4 text-sm leading-6 text-stone-600">
            Every box below already holds what the page says now. Change the ones you want to change and leave the rest.
            Emptying a box does not empty it on the site — it puts the original wording back.
          </p>
        )}
      </div>

      <form action={save} className="space-y-6 rounded-2xl border border-[var(--gold-light)] bg-white p-6">
        <input type="hidden" name="slug" value={destination.slug} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={destination.name} />
          <Field label="Country" name="country" defaultValue={destination.country} />
          <Field
            label="Region"
            name="region"
            defaultValue={destination.region ?? ""}
            hint="Only when the destination is not one town — “Dolomites”, “Côte d’Azur”."
          />
          <Field
            label="How long to give it"
            name="suggestedLength"
            defaultValue={destination.suggestedLength}
            hint="Rough on purpose — “3–5 days”."
          />
        </div>

        <Field
          label="Towns"
          name="cities"
          defaultValue={destination.cities.join(", ")}
          hint="Separated by commas, and spelled EXACTLY as they are on your listings. This is what the page joins against: a typo here shows as an empty section rather than a wrong one."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Where the kosher food comes from"
            name="kosherBaseCities"
            defaultValue={destination.kosherBase?.cities.join(", ") ?? ""}
            hint="For a destination with none of its own — the towns whose listings apply. Commas."
          />
          <Field
            label="…and what to say about it"
            name="kosherBaseNote"
            defaultValue={destination.kosherBase?.note ?? ""}
            hint="Both boxes or neither: a note with no town named cannot be acted on."
          />
        </div>

        <Checks
          label="What kind of trip"
          name="themes"
          options={TRIP_THEMES.map((theme) => ({ value: theme.value, label: theme.label }))}
          checked={destination.themes}
          hint="Decides which filters on the hub find it. None ticked leaves it as it was."
        />
        <Checks
          label="When in the year"
          name="seasons"
          options={SEASONS.map((season) => ({ value: season.value, label: season.label }))}
          checked={destination.seasons}
        />

        <Area label="Why go — one sentence, on the card" name="whyGo" defaultValue={destination.whyGo} rows={2} />
        <Field
          label="Who it is for"
          name="bestFor"
          defaultValue={destination.bestFor.join(", ")}
          hint="Two or three short phrases, separated by commas. They show as chips."
        />
        <Area label="Overview — two or three sentences at the top of the page" name="overview" defaultValue={destination.overview} />
        <Area
          label="Why visit — the longer answer"
          name="whyVisit"
          defaultValue={destination.whyVisit.join("\n")}
          hint="One point per line."
          rows={5}
        />
        <Area label="Best time to go" name="bestTime" defaultValue={destination.bestTime} rows={3} />
        <Area label="Who it suits, and who it does not" name="suits" defaultValue={destination.suits} rows={3} />
        <Area label="Getting there and getting around" name="transport" defaultValue={destination.transport} rows={3} />

        <div className="rounded-lg border border-dashed border-[var(--gold)] p-4">
          <p className={captionClass}>A shape for the days</p>
          <p className="mt-1 text-xs text-stone-400">
            Optional, and never a booking — a suggestion of how the days might fall.
          </p>
          <div className="mt-3 space-y-4">
            <Field label="Title" name="outlineTitle" defaultValue={destination.outline?.title ?? ""} />
            <Area
              label="Days"
              name="outlineDays"
              defaultValue={destination.outline?.days.join("\n") ?? ""}
              hint="One day per line, in order."
              rows={5}
            />
          </div>
        </div>

        <Area
          label="What catches people out"
          name="cautions"
          defaultValue={destination.cautions.join("\n")}
          hint="One per line. Specific enough to act on."
          rows={5}
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--gold-light)] pt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-6 text-sm font-bold uppercase tracking-[0.1em] text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <Result state={saved} />
      </form>

      <PhotoManager
        target={{ kind: "vacation-destination", ref: destination.slug }}
        slug={destination.slug}
        photos={photos}
        heading="Pictures"
        intro="A picture needs a credit before it can go on the site. Without one it is kept as a draft — upload it, find out whose it is, then publish."
      />

      <div className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Taking it off the site</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={setVisible}>
            <input type="hidden" name="slug" value={destination.slug} />
            <input type="hidden" name="visible" value={hidden ? "yes" : "no"} />
            <button
              type="submit"
              disabled={changingVisibility}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] disabled:opacity-60"
            >
              {hidden ? "Put it back on the site" : "Hide it from visitors"}
            </button>
          </form>

          {hasRow && (
            <form action={discard}>
              <input type="hidden" name="slug" value={destination.slug} />
              <button
                type="submit"
                disabled={discarding}
                className="inline-flex min-h-11 items-center rounded-md border border-red-700 px-5 text-xs font-bold uppercase tracking-[0.1em] text-red-700 disabled:opacity-60"
              >
                {builtIn ? "Undo all my changes" : "Delete this destination"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {builtIn
            ? "Hiding takes the page off the site and out of the lists; it can be put back. Undoing your changes leaves the destination on the site with the wording it came with."
            : "Hiding takes the page off the site and can be undone. Deleting cannot — this destination exists nowhere else."}
        </p>
        <Result state={visibility} />
        <Result state={discarded} />
      </div>
    </div>
  );
}
