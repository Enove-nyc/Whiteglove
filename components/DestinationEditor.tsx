"use client";

import FormDateField from "@/components/FormDateField";
import PhotoManager from "@/components/PhotoManager";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useFormDraft } from "@/components/useFormDraft";
import { describeDraft, draftKey, worthOffering } from "@/lib/drafts";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { Contact, Destination, DestinationLink, Photo, PracticalPlace } from "@prisma/client";
import {
  type ActionResult,
  deleteContactAction,
  deleteLinkAction,
  deletePlaceAction,
  saveContactAction,
  saveDestinationAction,
  saveLinkAction,
  savePlaceAction,
} from "@/app/admin/destinations/actions";
import { sectionLabel, sectionOptions } from "@/lib/destination-sections";

/** A listing carries its own pictures — of that hotel, that shul, that mikvah. */
type EditorPlace = PracticalPlace & { photos: Photo[] };

type EditorDestination = Destination & {
  contacts: Contact[];
  places: EditorPlace[];
  photos: Photo[];
};

// The kinds of listing come from lib/destination-sections.ts, the same list
// the completeness tracker counts and the public page renders. Seven of the
// thirteen used to be typed out here, which is why a town could have a
// hospital recorded nowhere and a Shabbos note recorded nowhere.

const HOW_CHECKED: Array<[string, string]> = [
  ["NEEDS_VERIFICATION", "Not checked yet"],
  ["VERIFIED", "Checked — details confirmed"],
  ["UNAVAILABLE", "Could not be confirmed"],
];

const STATUSES: Array<[string, string]> = [
  ["PUBLISHED", "Published — visible on the site"],
  ["DRAFT", "Draft — hidden from visitors"],
  ["NEEDS_REVIEW", "Needs review — hidden from visitors"],
];

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

/* ---- small field primitives ------------------------------------------ */

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={captionClass}>{label}</span>
      <input type={type} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={inputClass} />
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
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
    <label className="block">
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
    <label className="block">
      <span className={captionClass}>{label}</span>
      <select name={name} defaultValue={defaultValue ?? options[0][0]} className={inputClass}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}

// A labelled group of fields, so a card reads as tidy clusters.
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{label}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
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

/* ---- action-bound forms ---------------------------------------------- */

/**
 * Every form in this editor, with what was typed kept until it is saved.
 *
 * The save happens on the button and not before, which is right. It also means
 * an overview somebody spent twenty minutes on lives nowhere until they press
 * it — one closed tab and it is gone with nothing to say it existed. So the
 * typing is kept in their own browser, offered back when they return, and
 * thrown away the moment a save succeeds.
 */
function ActionForm({
  action,
  submitLabel,
  hidden,
  draftName,
  onSaved,
  children,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  hidden: Record<string, string>;
  /** Names this form's draft. Omit and nothing is kept. */
  draftName?: string;
  /** Called once the save goes through — the pop-up uses it to close itself. */
  onSaved?: () => void;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [restored, setRestored] = useState(false);
  // Keyed by the record as well as the form, so two towns never share one.
  const { draft, now, watch, remember, restoreInto, forget } = useFormDraft(
    draftKey(draftName, hidden.slug, hidden.contactId ?? hidden.placeId ?? ""),
  );
  const offer = Boolean(draftName) && !restored && worthOffering(draft, now);

  // Saved means there is nothing left to rescue. Writing to storage is
  // updating an outside system, which is what an effect is for.
  useEffect(() => {
    if (state?.ok) {
      forget();
      onSaved?.();
    }
  }, [state, forget, onSaved]);

  // Leaving with something unsaved should not be silent — the same warning
  // the page editor already gives.
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);

  return (
    <form ref={watch} action={formAction} onInput={() => draftName && remember()}>
      <Hidden values={hidden} />

      {offer && draft && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3">
          <p className="text-sm leading-6 text-stone-700">
            You typed something here {describeDraft(draft, now)} and did not save it. It is still on this
            computer.
          </p>
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                restoreInto();
                setRestored(true);
              }}
              className="min-h-11 rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              Put it back
            </button>
            <button
              type="button"
              onClick={() => {
                forget();
                setRestored(true);
              }}
              className="min-h-11 rounded-md border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-500"
            >
              Throw it away
            </button>
          </span>
        </div>
      )}

      {children}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state && (
          <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
        )}
        {/* Quiet, and only while there is something to lose. */}
        {draft && !offer && !state?.ok && (
          <span className="text-xs text-stone-400">Kept on this computer until you save.</span>
        )}
      </div>
    </form>
  );
}

function DeleteForm({
  action,
  hidden,
  label,
  name,
  onDone,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  label: string;
  name?: string;
  /** Called once the delete goes through — the pop-up uses it to close. */
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${name || "this"} permanently? This can't be undone.`)) event.preventDefault();
      }}
    >
      <Hidden values={hidden} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:text-red-800 disabled:opacity-50"
      >
        {pending ? "Removing…" : label}
      </button>
      {state && !state.ok && <span className="ml-3 text-sm font-semibold text-red-700">{state.message}</span>}
    </form>
  );
}

/* ---- cards ------------------------------------------------------------ */

// One record, opened over the list rather than sitting open beneath it. The
// list stays short and scannable; the form appears only for the row you press.
function RecordModal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div
      className="fixed inset-0 z-[var(--wg-z-modal,200)] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--gold-light)] bg-white p-6 shadow-[0_24px_60px_rgba(23,45,82,.20)] sm:p-8"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 transition hover:text-[var(--navy)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// A pressable row in a section list — name, a small line under it, and Edit.
function EditRow({ title, subtitle, badge, onClick }: { title: string; subtitle?: string; badge?: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#fcfaf6]"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--navy)]">{title}</span>
            {badge && <span className="rounded-full bg-[var(--gold-light)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">{badge}</span>}
          </span>
          {subtitle && <span className="mt-0.5 block truncate text-xs text-stone-500">{subtitle}</span>}
        </span>
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">Edit</span>
      </button>
    </li>
  );
}

const addButtonClass =
  "min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]";
const emptyListClass =
  "mt-4 rounded-lg border border-dashed border-[var(--gold-light)] bg-[#fcfaf6] p-5 text-sm leading-6 text-stone-600";
const listClass = "mt-4 divide-y divide-[var(--gold-light)] rounded-lg border border-[var(--gold-light)] bg-white";

function SectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string; count?: number }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">{eyebrow}</p>
        <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{title}</h2>
        {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      </div>
    </div>
  );
}

function PlaceFields({ place }: { place?: PracticalPlace }) {
  return (
    <>
      <Group label="Name & type">
        <Field label="Name" name="name" defaultValue={place?.name} placeholder="e.g. Hotel Sanz" />
        <label className="block">
          <span className={captionClass}>Type</span>
          {/* Grouped, because thirteen in a flat list is a list nobody reads
              to the bottom of — and the six added last are at the bottom. */}
          <select name="category" defaultValue={place?.category ?? "KOSHER_FOOD"} className={inputClass}>
            {sectionOptions().map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </Group>
      <Group label="How to reach them">
        <Field label="Phone" name="phone" defaultValue={place?.phone} placeholder="+48 ..." />
        <Field label="WhatsApp" name="whatsapp" defaultValue={place?.whatsapp} placeholder="+48 ..." />
        <Field label="Email" name="email" defaultValue={place?.email} placeholder="name@example.com" />
        <Field label="Website" name="website" defaultValue={place?.website} placeholder="https://..." />
      </Group>
      <Group label="Details">
        <label className="block">
          <span className={captionClass}>Address</span>
          <AddressAutocomplete name="address" value={place?.address ?? ""} placeholder="Start typing the address…" className={inputClass} />
        </label>
        <Field label="Hours / timings" name="hours" defaultValue={place?.hours} placeholder="e.g. Shacharis 7:30, 8:30" />
      </Group>
      <div className="mt-4">
        <TextArea label="Notes" name="notes" defaultValue={place?.notes} placeholder="Anything else visitors should know" rows={2} />
      </div>
      <Group label="How far this has been checked">
        {/* Separate from Visibility on purpose. Visibility is "is this live";
            this is "how much of it do we stand behind", and it is what becomes
            "Verified on 3 March 2026" on the page. */}
        <SelectField label="Checked?" name="verification" options={HOW_CHECKED} defaultValue={place?.verification} />
        <label className="block">
          <span className={captionClass}>Date checked</span>
          <FormDateField
            name="lastVerified"
            defaultValue={place?.lastVerified ? place.lastVerified.toISOString().slice(0, 10) : ""}
            className={inputClass}
            ariaLabel="Date checked"
          />
        </label>
      </Group>
      <div className="mt-4">
        <Field label="Where this came from" name="sourceUrl" defaultValue={place?.sourceUrl} placeholder="A link, or who told you" />
      </div>
      <div className="mt-4 sm:max-w-sm">
        <SelectField label="Visibility" name="status" options={STATUSES} defaultValue={place?.status} />
      </div>
    </>
  );
}

function ContactFields({ contact }: { contact?: Contact }) {
  return (
    <>
      <Group label="Contact">
        <Field label="Label" name="label" defaultValue={contact?.label} placeholder="e.g. Shomer / access desk" hint="Shown as the heading for this contact" />
        <Field label="Phone" name="phone" defaultValue={contact?.phone} placeholder="+48 ..." />
        <Field label="Email" name="email" defaultValue={contact?.email} placeholder="name@example.com" />
      </Group>
      <div className="mt-4">
        <TextArea label="Note" name="note" defaultValue={contact?.note} placeholder="When to call, what they help with" rows={2} />
      </div>
    </>
  );
}

/**
 * One useful link.
 *
 * The label is required and the URL is normalised on save — see
 * saveLinkAction. "Order" is a plain number because these are hand-ranked:
 * the most useful link for a town is rarely the one added first.
 */
function LinkFields({ link }: { link?: DestinationLink }) {
  return (
    <>
      <Group label="Link">
        <Field
          label="What it says on the page"
          name="label"
          defaultValue={link?.label}
          placeholder="e.g. Uman Info — getting there"
          hint="Never leave this as the bare address"
        />
        <Field label="Web address" name="url" defaultValue={link?.url} placeholder="umaninfo.com/ways" hint="https is added for you" />
        <Field label="Order" name="position" defaultValue={link ? String(link.position) : "0"} placeholder="0" hint="Lower shows first" />
      </Group>
      <div className="mt-4">
        <TextArea label="Note" name="note" defaultValue={link?.note} placeholder="One line on what is over there" rows={2} />
      </div>
    </>
  );
}

/* ---- main ------------------------------------------------------------- */

export default function DestinationEditor({
  destination,
  links = [],
}: {
  destination: EditorDestination;
  // Read separately from the destination, so a database without the
  // DestinationLink migration gives an empty list instead of taking the whole
  // editor down. See app/admin/destinations/page.tsx.
  links?: DestinationLink[];
}) {
  const slug = destination.slug;
  const base = { slug, destinationId: destination.id };

  // Which record is open over its list, if any. null in every slot = the
  // lists are all closed and only the short rows show.
  const [open, setOpen] = useState<
    | { kind: "contact"; item: Contact | null }
    | { kind: "link"; item: DestinationLink | null }
    | { kind: "place"; item: EditorPlace | null }
    | null
  >(null);
  const close = () => setOpen(null);

  return (
    <div className="space-y-12">
      {/* Core destination details */}
      <section>
        <SectionHeader eyebrow={`Editing · ${destination.country}`} title={destination.city} hint="The headline details shown at the top of this destination's page." />
        <div className="rounded-lg border border-[var(--gold-light)] bg-white p-6 shadow-sm sm:p-7">
          <ActionForm action={saveDestinationAction} submitLabel="Save details" hidden={{ slug }} draftName="destination">
            <Group label="Names">
              <Field label="City name" name="city" defaultValue={destination.city} />
              <Field label="Yiddish name" name="yiddishCity" defaultValue={destination.yiddishCity} />
              <Field label="Country" name="country" defaultValue={destination.country} />
              <SelectField label="Visibility" name="status" options={STATUSES} defaultValue={destination.status} />
            </Group>
            <div className="mt-5 space-y-4">
              <TextArea label="Safety / travel notice" name="safetyNote" defaultValue={destination.safetyNote} placeholder="Shown as a banner when set — leave empty for none" rows={2} />
              <TextArea label="Overview" name="overview" defaultValue={destination.overview} rows={3} />
              <TextArea label="Short summary" name="summary" defaultValue={destination.summary} rows={2} />
            </div>
          </ActionForm>
        </div>
      </section>

      {/* Shomer / access contacts */}
      <section>
        <SectionHeader eyebrow="Contacts" title="Shomer & access numbers" hint="The people a visitor can call about access to the kever." count={destination.contacts.length} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen({ kind: "contact", item: null })} className={addButtonClass}>Add a contact</button>
          <span className="text-sm text-stone-500">{destination.contacts.length} listed</span>
        </div>
        {destination.contacts.length === 0 ? (
          <p className={emptyListClass}>No contacts yet. Press &ldquo;Add a contact&rdquo; to add the first.</p>
        ) : (
          <ul className={listClass}>
            {destination.contacts.map((contact) => (
              <EditRow
                key={contact.id}
                title={contact.label || "Contact"}
                subtitle={contact.phone || contact.email || undefined}
                badge="Contact"
                onClick={() => setOpen({ kind: "contact", item: contact })}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Somewhere else worth reading about this town — umaninfo.com for
          Uman, lizansk.com for Lizhensk. Not a source (that is the field at
          the top) and not a listing (those have addresses). */}
      <section>
        <SectionHeader
          eyebrow="Useful links"
          title="Other websites about this town"
          hint="Sites that know more about this town than we do. They open in a new tab, and the page says where each one goes."
          count={links.length}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen({ kind: "link", item: null })} className={addButtonClass}>Add a link</button>
          <span className="text-sm text-stone-500">{links.length} listed</span>
        </div>
        {links.length === 0 ? (
          <p className={emptyListClass}>No links yet. Press &ldquo;Add a link&rdquo; to add one.</p>
        ) : (
          <ul className={listClass}>
            {links.map((link) => (
              <EditRow
                key={link.id}
                title={link.label || "Link"}
                subtitle={link.url || undefined}
                badge="Link"
                onClick={() => setOpen({ kind: "link", item: link })}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Pictures of the town itself. Pictures of one hotel or one shul go on
          that listing further down, where somebody comparing two of them will
          actually be looking. */}
      <section>
        <PhotoManager
          target={{ kind: "destination", ref: destination.id }}
          slug={destination.slug}
          photos={destination.photos}
        />
      </section>

      <section>
        <SectionHeader
          eyebrow="Listings"
          title="Everything practical about this place"
          hint="Everything practical around the visit. Only Published listings appear to visitors."
          count={destination.places.length}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen({ kind: "place", item: null })} className={addButtonClass}>Add a listing</button>
          <span className="text-sm text-stone-500">{destination.places.length} listed</span>
        </div>
        {destination.places.length === 0 ? (
          <p className={emptyListClass}>No listings yet. Press &ldquo;Add a listing&rdquo; to add the first.</p>
        ) : (
          <ul className={listClass}>
            {destination.places.map((place) => (
              <EditRow
                key={place.id}
                title={place.name || "Listing"}
                subtitle={[place.status !== "PUBLISHED" ? place.status.replace(/_/g, " ").toLowerCase() : "", place.address ?? ""].filter(Boolean).join(" · ") || undefined}
                badge={sectionLabel(place.category)}
                onClick={() => setOpen({ kind: "place", item: place })}
              />
            ))}
          </ul>
        )}
      </section>

      {/* One record at a time, over its list. */}
      {open?.kind === "contact" && (
        <RecordModal label={open.item ? open.item.label || "Edit contact" : "Add a contact"} onClose={close}>
          <ActionForm
            key={open.item?.id ?? "new-contact"}
            action={saveContactAction}
            submitLabel={open.item ? "Save contact" : "Add contact"}
            hidden={open.item ? { ...base, contactId: open.item.id } : base}
            draftName={open.item ? "contact" : "new-contact"}
            onSaved={close}
          >
            <ContactFields contact={open.item ?? undefined} />
          </ActionForm>
          {open.item && (
            <div className="mt-4 border-t border-[var(--gold-light)] pt-4">
              <DeleteForm action={deleteContactAction} hidden={{ slug, contactId: open.item.id }} label="Delete contact" name={open.item.label || "this contact"} onDone={close} />
            </div>
          )}
        </RecordModal>
      )}

      {open?.kind === "link" && (
        <RecordModal label={open.item ? open.item.label || "Edit link" : "Add a link"} onClose={close}>
          <ActionForm
            key={open.item?.id ?? "new-link"}
            action={saveLinkAction}
            submitLabel={open.item ? "Save link" : "Add link"}
            hidden={open.item ? { ...base, linkId: open.item.id } : base}
            draftName={open.item ? "link" : "new-link"}
            onSaved={close}
          >
            <LinkFields link={open.item ?? undefined} />
          </ActionForm>
          {open.item && (
            <div className="mt-4 border-t border-[var(--gold-light)] pt-4">
              <DeleteForm action={deleteLinkAction} hidden={{ slug, linkId: open.item.id }} label="Delete link" name={open.item.label || "this link"} onDone={close} />
            </div>
          )}
        </RecordModal>
      )}

      {open?.kind === "place" && (
        <RecordModal label={open.item ? open.item.name || "Edit listing" : "Add a listing"} onClose={close}>
          <ActionForm
            key={open.item?.id ?? "new-listing"}
            action={savePlaceAction}
            submitLabel={open.item ? "Save listing" : "Add listing"}
            hidden={open.item ? { ...base, placeId: open.item.id } : base}
            draftName={open.item ? "listing" : "new-listing"}
            onSaved={close}
          >
            <PlaceFields place={open.item ?? undefined} />
          </ActionForm>
          {open.item && (
            <>
              {/* Pictures of this one listing. Its own form — a picture saves on
                  its own and must not be lost when the listing is saved. */}
              <div className="mt-6 border-t border-[var(--gold-light)] pt-5">
                <PhotoManager
                  target={{ kind: "place", ref: open.item.id }}
                  slug={slug}
                  photos={open.item.photos}
                  heading={`Pictures of ${open.item.name || "this listing"}`}
                  compact
                />
              </div>
              <div className="mt-4 border-t border-[var(--gold-light)] pt-4">
                <DeleteForm action={deletePlaceAction} hidden={{ slug, placeId: open.item.id }} label={`Delete ${open.item.name || "listing"}`} name={open.item.name || "this listing"} onDone={close} />
              </div>
            </>
          )}
        </RecordModal>
      )}
    </div>
  );
}
