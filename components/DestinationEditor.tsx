"use client";

import { useActionState } from "react";
import type { Contact, Destination, PracticalPlace } from "@prisma/client";
import {
  type ActionResult,
  deleteContactAction,
  deletePlaceAction,
  saveContactAction,
  saveDestinationAction,
  savePlaceAction,
} from "@/app/admin/destinations/actions";

type EditorDestination = Destination & {
  contacts: Contact[];
  places: PracticalPlace[];
};

const CATEGORIES: Array<[string, string]> = [
  ["ACCOMMODATION", "Accommodation"],
  ["KOSHER_FOOD", "Kosher food"],
  ["MINYAN", "Minyan"],
  ["MIKVAH", "Mikvah"],
  ["TRANSPORT", "Transport"],
  ["AIRPORT", "Airport"],
  ["DRIVER", "Driver"],
];

const STATUSES: Array<[string, string]> = [
  ["PUBLISHED", "Published — visible on the site"],
  ["DRAFT", "Draft — hidden from visitors"],
  ["NEEDS_REVIEW", "Needs review — hidden from visitors"],
];

const inputClass =
  "mt-1 w-full border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none";
const labelClass = "block";
const captionClass = "text-xs font-bold uppercase tracking-[0.12em] text-stone-500";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className={labelClass}>
      <span className={captionClass}>{label}</span>
      <input type={type} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className={labelClass}>
      <span className={captionClass}>{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} rows={rows} className={inputClass} />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
  defaultValue?: string;
}) {
  return (
    <label className={labelClass}>
      <span className={captionClass}>{label}</span>
      <select name={name} defaultValue={defaultValue ?? options[0][0]} className={inputClass}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}

function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </>
  );
}

function SubmitRow({ pending, label, state }: { pending: boolean; label: string; state: ActionResult | null }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
      >
        {pending ? "Saving…" : label}
      </button>
      {state && (
        <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
      )}
    </div>
  );
}

// A form bound to a server action, with inline save feedback.
function ActionForm({
  action,
  submitLabel,
  hidden,
  children,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  hidden: Record<string, string>;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction}>
      <Hidden values={hidden} />
      {children}
      <SubmitRow pending={pending} label={submitLabel} state={state} />
    </form>
  );
}

// Delete confirmation — preventDefault in onSubmit cancels the form action.
function DeleteForm({
  action,
  hidden,
  label,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Remove this permanently? This can't be undone.")) event.preventDefault();
      }}
    >
      <Hidden values={hidden} />
      <button
        type="submit"
        disabled={pending}
        className="border border-red-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-700 hover:text-white disabled:opacity-50"
      >
        {pending ? "Removing…" : label}
      </button>
      {state && !state.ok && <p className="mt-2 text-sm font-semibold text-red-700">{state.message}</p>}
    </form>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{eyebrow}</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{title}</h2>
    </div>
  );
}

function PlaceFields({ place }: { place?: PracticalPlace }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" defaultValue={place?.name} placeholder="e.g. Hotel Sanz" />
      <SelectField label="Type" name="category" options={CATEGORIES} defaultValue={place?.category} />
      <Field label="Phone" name="phone" defaultValue={place?.phone} placeholder="+48 ..." />
      <Field label="WhatsApp" name="whatsapp" defaultValue={place?.whatsapp} placeholder="+48 ..." />
      <Field label="Email" name="email" defaultValue={place?.email} placeholder="name@example.com" />
      <Field label="Website" name="website" defaultValue={place?.website} placeholder="https://..." />
      <Field label="Hours / timings" name="hours" defaultValue={place?.hours} placeholder="e.g. Shacharis 7:30, 8:30" />
      <SelectField label="Visibility" name="status" options={STATUSES} defaultValue={place?.status} />
      <div className="sm:col-span-2">
        <Field label="Address" name="address" defaultValue={place?.address} placeholder="Street, city" />
      </div>
      <div className="sm:col-span-2">
        <TextArea label="Notes" name="notes" defaultValue={place?.notes} placeholder="Anything else visitors should know" rows={2} />
      </div>
    </div>
  );
}

function ContactFields({ contact }: { contact?: Contact }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Label" name="label" defaultValue={contact?.label} placeholder="e.g. Shomer / access desk" />
      <Field label="Phone" name="phone" defaultValue={contact?.phone} placeholder="+48 ..." />
      <Field label="Email" name="email" defaultValue={contact?.email} placeholder="name@example.com" />
      <div className="sm:col-span-2">
        <TextArea label="Note" name="note" defaultValue={contact?.note} placeholder="When to call, what they help with" rows={2} />
      </div>
    </div>
  );
}

export default function DestinationEditor({ destination }: { destination: EditorDestination }) {
  const slug = destination.slug;
  const base = { slug, destinationId: destination.id };

  return (
    <div className="space-y-10">
      {/* Core destination details */}
      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
        <SectionTitle eyebrow={`Editing · ${destination.country}`} title={destination.city} />
        <ActionForm action={saveDestinationAction} submitLabel="Save details" hidden={{ slug }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City name" name="city" defaultValue={destination.city} />
            <Field label="Yiddish name" name="yiddishCity" defaultValue={destination.yiddishCity} />
            <Field label="Country" name="country" defaultValue={destination.country} />
            <SelectField label="Visibility" name="status" options={STATUSES} defaultValue={destination.status} />
            <div className="sm:col-span-2">
              <TextArea label="Safety / travel notice" name="safetyNote" defaultValue={destination.safetyNote} placeholder="Shown as a banner when set" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Overview" name="overview" defaultValue={destination.overview} rows={3} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Short summary" name="summary" defaultValue={destination.summary} rows={2} />
            </div>
          </div>
        </ActionForm>
      </section>

      {/* Shomer / access contacts */}
      <section>
        <SectionTitle eyebrow="Contacts" title="Shomer & access numbers" />
        <div className="space-y-5">
          {destination.contacts.map((contact) => (
            <div key={contact.id} className="border border-[var(--gold-light)] bg-white p-5">
              <ActionForm action={saveContactAction} submitLabel="Save contact" hidden={{ ...base, contactId: contact.id }}>
                <ContactFields contact={contact} />
              </ActionForm>
              <div className="mt-3 border-t border-[var(--gold-light)] pt-3">
                <DeleteForm action={deleteContactAction} hidden={{ slug, contactId: contact.id }} label="Delete contact" />
              </div>
            </div>
          ))}
          <div className="border border-dashed border-[var(--gold)] bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Add a contact</p>
            <ActionForm action={saveContactAction} submitLabel="Add contact" hidden={base}>
              <ContactFields />
            </ActionForm>
          </div>
        </div>
      </section>

      {/* Practical places */}
      <section>
        <SectionTitle eyebrow="Listings" title="Hotels, food, minyanim, mikvaos, transport" />
        <div className="space-y-5">
          {destination.places.map((place) => (
            <div key={place.id} className="border border-[var(--gold-light)] bg-white p-5">
              <ActionForm action={savePlaceAction} submitLabel="Save listing" hidden={{ ...base, placeId: place.id }}>
                <PlaceFields place={place} />
              </ActionForm>
              <div className="mt-3 border-t border-[var(--gold-light)] pt-3">
                <DeleteForm action={deletePlaceAction} hidden={{ slug, placeId: place.id }} label="Delete listing" />
              </div>
            </div>
          ))}
          <div className="border border-dashed border-[var(--gold)] bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Add a listing</p>
            <ActionForm action={savePlaceAction} submitLabel="Add listing" hidden={base}>
              <PlaceFields />
            </ActionForm>
          </div>
        </div>
      </section>
    </div>
  );
}
