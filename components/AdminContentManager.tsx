"use client";

import { useMemo, useState } from "react";
import type { AdminContentBundle, EditableAccommodation, EditableLocation, SiteSettings } from "@/lib/admin-content";

type Tab = "settings" | "locations" | "bulk" | "accommodations" | "suggestions" | "report";

function statusClass(status: string) {
  if (status === "published") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "draft") return "bg-stone-50 text-stone-700 border-stone-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

const locationCsvTemplate = [
  "id,route,title,yiddishTitle,category,country,address,coordinates,shomerContact,source,notes,status,lastVerified",
  "cemetery-lizhensk,/cemeteries/lizhensk,Jewish Cemetery in Lizhensk,ליזענסק,cemetery,Poland,\"Górna 16, 37-300 Leżajsk, Poland\",\"50.251263, 22.421938\",,+source-url,\"Reb Elimelech of Lizhensk\",published,",
].join("\n");

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseLocationsCsv(text: string): EditableLocation[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    return {
      id: row.id || `bulk-location-${index + 1}-${Date.now()}`,
      route: row.route || "",
      title: row.title || "",
      yiddishTitle: row.yiddishtitle || "",
      category: (row.category === "city-guide" || row.category === "cemetery" ? row.category : "destination") as EditableLocation["category"],
      country: row.country || "",
      address: row.address || "",
      coordinates: row.coordinates || "",
      shomerContact: row.shomercontact || "",
      source: row.source || "",
      notes: row.notes || "",
      status: (row.status === "published" || row.status === "needs-review" ? row.status : "draft") as EditableLocation["status"],
      lastVerified: row.lastverified || "",
    };
  }).filter((item) => item.title.trim() || item.yiddishTitle.trim() || item.route.trim());
}

export default function AdminContentManager({ initialBundle, configured }: { initialBundle: AdminContentBundle; configured: boolean }) {
  const [bundle, setBundle] = useState(initialBundle);
  const [tab, setTab] = useState<Tab>("report");
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState(configured ? "" : "Connect the private database before editing site content.");
  const [locationQuery, setLocationQuery] = useState("");
  const [accommodationQuery, setAccommodationQuery] = useState("");
  const [bulkCsv, setBulkCsv] = useState(locationCsvTemplate);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(bundle.settings);
  const [newLocation, setNewLocation] = useState<EditableLocation>({
    id: "",
    route: "",
    title: "",
    yiddishTitle: "",
    category: "destination",
    country: "",
    address: "",
    coordinates: "",
    shomerContact: "",
    source: "",
    notes: "",
    status: "draft",
    lastVerified: "",
  });
  const [newAccommodation, setNewAccommodation] = useState<EditableAccommodation>({
    id: "",
    locationId: "",
    name: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    bookingLink: "",
    amenities: "",
    kosherInfo: "",
    notes: "",
    status: "draft",
    lastVerified: "",
  });

  const missing = useMemo(() => ({
    locationsMissingAddress: bundle.locations.filter((item) => !item.address.trim()).length,
    locationsMissingCoordinates: bundle.locations.filter((item) => !item.coordinates.trim()).length,
    locationsMissingShomer: bundle.locations.filter((item) => !item.shomerContact.trim()).length,
    accommodationsMissing: bundle.accommodations.filter((item) => !item.address.trim() || !item.name.trim()).length,
    pendingSuggestions: bundle.suggestions.filter((item) => item.status === "pending").length,
  }), [bundle]);

  async function save(kind: "settings" | "location" | "locations-bulk" | "accommodation" | "suggestion", data: unknown) {
    if (!configured) {
      setMessage("Connect the private database before editing site content.");
      return;
    }
    setSavingKey(kind);
    setMessage("Saving...");
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data }),
    });
    const next = await response.json().catch(() => null) as { bundle?: AdminContentBundle; error?: string } | null;
    setSavingKey("");
    if (!response.ok || !next?.bundle) {
      setMessage(next?.error || "The content could not be saved.");
      return;
    }
    setBundle(next.bundle);
    setSiteSettings(next.bundle.settings);
    setMessage("Saved.");
  }

  const filteredLocations = bundle.locations.filter((item) => `${item.title} ${item.yiddishTitle} ${item.route} ${item.country}`.toLowerCase().includes(locationQuery.toLowerCase()));
  const filteredAccommodations = bundle.accommodations.filter((item) => `${item.name} ${item.locationId} ${item.address}`.toLowerCase().includes(accommodationQuery.toLowerCase()));

  function addLocation() {
    const id = newLocation.id || `location-${Date.now()}`;
    void save("location", { ...newLocation, id });
    setNewLocation({
      id: "",
      route: "",
      title: "",
      yiddishTitle: "",
      category: "destination",
      country: "",
      address: "",
      coordinates: "",
      shomerContact: "",
      source: "",
      notes: "",
      status: "draft",
      lastVerified: "",
    });
  }

  async function importLocations() {
    const parsed = parseLocationsCsv(bulkCsv);
    if (parsed.length === 0) {
      setMessage("Paste at least one row of location data.");
      return;
    }
    await save("locations-bulk", parsed);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Locations" value={bundle.locations.length} />
        <Metric label="Accommodations" value={bundle.accommodations.length} />
        <Metric label="Pending suggestions" value={missing.pendingSuggestions} />
        <Metric label="Missing addresses" value={missing.locationsMissingAddress} />
        <Metric label="Missing shomer numbers" value={missing.locationsMissingShomer} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--gold-light)] pb-4">
        {(["report", "settings", "locations", "bulk", "accommodations", "suggestions"] as Tab[]).map((name) => (
          <button key={name} type="button" onClick={() => setTab(name)} className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${tab === name ? "border border-[var(--navy)] bg-[var(--navy)] text-white" : "border border-[var(--gold-light)] text-[var(--navy)]"}`}>
            {name}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 text-sm leading-6 text-stone-600">{message}</p>}

      {tab === "report" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReportCard title="Needs address" value={missing.locationsMissingAddress} note="Location records with blank addresses." />
          <ReportCard title="Needs coordinates" value={missing.locationsMissingCoordinates} note="Location records missing map-ready coordinates." />
          <ReportCard title="Needs shomer" value={missing.locationsMissingShomer} note="Location records without a contact number." />
          <ReportCard title="Needs accommodation" value={missing.accommodationsMissing} note="Accommodation records missing required fields." />
          <ReportCard title="Pending suggestions" value={missing.pendingSuggestions} note="Visitor edits waiting for review." />
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-6 grid gap-4 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Site settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hero title" value={siteSettings.heroTitle} onChange={(value) => setSiteSettings((current) => ({ ...current, heroTitle: value }))} />
            <Field label="Footer email" value={siteSettings.footerEmail} onChange={(value) => setSiteSettings((current) => ({ ...current, footerEmail: value }))} />
          </div>
          <Field label="Hero subtitle" value={siteSettings.heroSubtitle} onChange={(value) => setSiteSettings((current) => ({ ...current, heroSubtitle: value }))} textarea />
          <Field label="Search placeholder" value={siteSettings.searchPlaceholder} onChange={(value) => setSiteSettings((current) => ({ ...current, searchPlaceholder: value }))} />
          <Field label="Public notice" value={siteSettings.publicNotice} onChange={(value) => setSiteSettings((current) => ({ ...current, publicNotice: value }))} textarea />
          <Field label="Booking notice" value={siteSettings.bookingNotice} onChange={(value) => setSiteSettings((current) => ({ ...current, bookingNotice: value }))} textarea />
          <button disabled={savingKey === "settings"} type="button" onClick={() => save("settings", siteSettings)} className="justify-self-start border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] disabled:opacity-60">Save site settings</button>
        </div>
      )}

      {tab === "locations" && (
        <div className="mt-6 space-y-4">
          <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search locations" className="w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-sm outline-none" />
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add location</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="ID" value={newLocation.id} onChange={(value) => setNewLocation((current) => ({ ...current, id: value }))} />
              <Field label="Route" value={newLocation.route} onChange={(value) => setNewLocation((current) => ({ ...current, route: value }))} />
              <Field label="Title" value={newLocation.title} onChange={(value) => setNewLocation((current) => ({ ...current, title: value }))} />
              <Field label="Yiddish title" value={newLocation.yiddishTitle} onChange={(value) => setNewLocation((current) => ({ ...current, yiddishTitle: value }))} />
              <Field label="Country" value={newLocation.country} onChange={(value) => setNewLocation((current) => ({ ...current, country: value }))} />
              <Field label="Coordinates" value={newLocation.coordinates} onChange={(value) => setNewLocation((current) => ({ ...current, coordinates: value }))} />
              <Field label="Shomer contact" value={newLocation.shomerContact} onChange={(value) => setNewLocation((current) => ({ ...current, shomerContact: value }))} />
              <Field label="Source" value={newLocation.source} onChange={(value) => setNewLocation((current) => ({ ...current, source: value }))} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Address" value={newLocation.address} onChange={(value) => setNewLocation((current) => ({ ...current, address: value }))} textarea />
              <Field label="Notes" value={newLocation.notes} onChange={(value) => setNewLocation((current) => ({ ...current, notes: value }))} textarea />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <select value={newLocation.category} onChange={(event) => setNewLocation((current) => ({ ...current, category: event.target.value as EditableLocation["category"] }))} className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
                <option value="destination">Destination</option>
                <option value="city-guide">City guide</option>
                <option value="cemetery">Cemetery</option>
              </select>
              <select value={newLocation.status} onChange={(event) => setNewLocation((current) => ({ ...current, status: event.target.value as EditableLocation["status"] }))} className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
                <option value="draft">Draft</option>
                <option value="needs-review">Needs review</option>
                <option value="published">Published</option>
              </select>
              <input value={newLocation.lastVerified} onChange={(event) => setNewLocation((current) => ({ ...current, lastVerified: event.target.value }))} placeholder="Last verified" className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm" />
              <button type="button" onClick={addLocation} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Save location</button>
            </div>
          </div>
          {filteredLocations.map((item) => (
            <LocationEditor key={item.id} item={item} onSave={(next) => save("location", next)} saving={savingKey === "location"} />
          ))}
        </div>
      )}

      {tab === "bulk" && (
        <div className="mt-6 border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Bulk import locations</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Paste CSV rows for cemetery and tzaddik records here. Use English and Yiddish fields together so the public pages stay searchable in both languages.
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Columns</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">id, route, title, yiddishTitle, category, country, address, coordinates, shomerContact, source, notes, status, lastVerified</p>
          <textarea value={bulkCsv} onChange={(event) => setBulkCsv(event.target.value)} rows={14} className="mt-4 w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-sm outline-none" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={importLocations} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Import locations</button>
            <button type="button" onClick={() => setBulkCsv(locationCsvTemplate)} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Reset template</button>
          </div>
        </div>
      )}

      {tab === "accommodations" && (
        <div className="mt-6 space-y-4">
          <input value={accommodationQuery} onChange={(event) => setAccommodationQuery(event.target.value)} placeholder="Search accommodations" className="w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-sm outline-none" />
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add accommodation</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Location ID" value={newAccommodation.locationId} onChange={(value) => setNewAccommodation((current) => ({ ...current, locationId: value }))} />
              <Field label="Name" value={newAccommodation.name} onChange={(value) => setNewAccommodation((current) => ({ ...current, name: value }))} />
              <Field label="Address" value={newAccommodation.address} onChange={(value) => setNewAccommodation((current) => ({ ...current, address: value }))} />
              <Field label="Phone" value={newAccommodation.phone} onChange={(value) => setNewAccommodation((current) => ({ ...current, phone: value }))} />
              <Field label="WhatsApp" value={newAccommodation.whatsapp} onChange={(value) => setNewAccommodation((current) => ({ ...current, whatsapp: value }))} />
              <Field label="Email" value={newAccommodation.email} onChange={(value) => setNewAccommodation((current) => ({ ...current, email: value }))} />
              <Field label="Website" value={newAccommodation.website} onChange={(value) => setNewAccommodation((current) => ({ ...current, website: value }))} />
              <Field label="Booking link" value={newAccommodation.bookingLink} onChange={(value) => setNewAccommodation((current) => ({ ...current, bookingLink: value }))} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Amenities" value={newAccommodation.amenities} onChange={(value) => setNewAccommodation((current) => ({ ...current, amenities: value }))} textarea />
              <Field label="Kosher info" value={newAccommodation.kosherInfo} onChange={(value) => setNewAccommodation((current) => ({ ...current, kosherInfo: value }))} textarea />
            </div>
            <Field label="Notes" value={newAccommodation.notes} onChange={(value) => setNewAccommodation((current) => ({ ...current, notes: value }))} textarea />
            <div className="mt-4 flex flex-wrap gap-3">
              <select value={newAccommodation.status} onChange={(event) => setNewAccommodation((current) => ({ ...current, status: event.target.value as EditableAccommodation["status"] }))} className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
                <option value="draft">Draft</option>
                <option value="needs-review">Needs review</option>
                <option value="published">Published</option>
              </select>
              <input value={newAccommodation.lastVerified} onChange={(event) => setNewAccommodation((current) => ({ ...current, lastVerified: event.target.value }))} placeholder="Last verified" className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm" />
              <button type="button" onClick={() => { const id = newAccommodation.id || `accommodation-${Date.now()}`; void save("accommodation", { ...newAccommodation, id }); setNewAccommodation((current) => ({ ...current, id: "", locationId: "", name: "", address: "", phone: "", whatsapp: "", email: "", website: "", bookingLink: "", amenities: "", kosherInfo: "", notes: "", lastVerified: "" })); }} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Save accommodation</button>
            </div>
          </div>
          {filteredAccommodations.map((item) => (
            <AccommodationEditor key={item.id} item={item} onSave={(next) => save("accommodation", next)} saving={savingKey === "accommodation"} />
          ))}
        </div>
      )}

      {tab === "suggestions" && (
        <div className="mt-6 space-y-4">
          {bundle.suggestions.length === 0 ? <p className="text-sm text-stone-600">No suggestions yet.</p> : bundle.suggestions.map((item) => (
            <article key={item.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{item.targetType}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{item.title}</h3>
                </div>
                <span className={`border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(item.status)}`}>{item.status}</span>
              </div>
              <p className="mt-3 text-sm text-stone-600"><strong>{item.name}</strong> - {item.email}</p>
              <p className="mt-3 text-sm leading-6 text-stone-700"><strong>Issue:</strong> {item.issue}</p>
              <p className="mt-2 text-sm leading-6 text-stone-700"><strong>Suggested:</strong> {item.suggestedInfo}</p>
              {item.currentInfo && <p className="mt-2 text-sm leading-6 text-stone-500"><strong>Current:</strong> {item.currentInfo}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {(["approved", "rejected", "needs-info"] as const).map((status) => (
                  <button key={status} type="button" onClick={() => save("suggestion", { id: item.id, status, reviewerNotes: "" })} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{label}</p><p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{value}</p></div>;
}

function ReportCard({ title, value, note }: { title: string; value: number; note: string }) {
  return <article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{title}</p><p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{value}</p><p className="mt-3 text-sm leading-6 text-stone-600">{note}</p></article>;
}

function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  const className = "mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none";
  return <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">{label}{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={className} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />}</label>;
}

function LocationEditor({ item, onSave, saving }: { item: EditableLocation; onSave: (item: EditableLocation) => void; saving: boolean }) {
  const [draft, setDraft] = useState(item);
  return (
    <article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{draft.category}</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{draft.title}</h3>
          <p className="text-sm text-stone-500">{draft.route}</p>
        </div>
        <span className={`border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(draft.status)}`}>{draft.status}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
        <Field label="Yiddish title" value={draft.yiddishTitle} onChange={(value) => setDraft((current) => ({ ...current, yiddishTitle: value }))} />
        <Field label="Country" value={draft.country} onChange={(value) => setDraft((current) => ({ ...current, country: value }))} />
        <Field label="Route" value={draft.route} onChange={(value) => setDraft((current) => ({ ...current, route: value }))} />
        <Field label="Address" value={draft.address} onChange={(value) => setDraft((current) => ({ ...current, address: value }))} textarea />
        <Field label="Coordinates" value={draft.coordinates} onChange={(value) => setDraft((current) => ({ ...current, coordinates: value }))} />
        <Field label="Shomer contact" value={draft.shomerContact} onChange={(value) => setDraft((current) => ({ ...current, shomerContact: value }))} />
        <Field label="Source" value={draft.source} onChange={(value) => setDraft((current) => ({ ...current, source: value }))} />
      </div>
      <Field label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} textarea />
      <div className="mt-4 flex flex-wrap gap-3">
        <input value={draft.lastVerified} onChange={(event) => setDraft((current) => ({ ...current, lastVerified: event.target.value }))} placeholder="Last verified" className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm" />
        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as EditableLocation["status"] }))} className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
          <option value="draft">Draft</option>
          <option value="needs-review">Needs review</option>
          <option value="published">Published</option>
        </select>
        <button type="button" disabled={saving} onClick={() => onSave(draft)} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] disabled:opacity-60">Save location</button>
      </div>
    </article>
  );
}

function AccommodationEditor({ item, onSave, saving }: { item: EditableAccommodation; onSave: (item: EditableAccommodation) => void; saving: boolean }) {
  const [draft, setDraft] = useState(item);
  return (
    <article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{draft.locationId}</p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{draft.name || "Accommodation"}</h3>
        </div>
        <span className={`border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(draft.status)}`}>{draft.status}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Location ID" value={draft.locationId} onChange={(value) => setDraft((current) => ({ ...current, locationId: value }))} />
        <Field label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <Field label="Address" value={draft.address} onChange={(value) => setDraft((current) => ({ ...current, address: value }))} />
        <Field label="Phone" value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} />
        <Field label="WhatsApp" value={draft.whatsapp} onChange={(value) => setDraft((current) => ({ ...current, whatsapp: value }))} />
        <Field label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
        <Field label="Website" value={draft.website} onChange={(value) => setDraft((current) => ({ ...current, website: value }))} />
        <Field label="Booking link" value={draft.bookingLink} onChange={(value) => setDraft((current) => ({ ...current, bookingLink: value }))} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Amenities" value={draft.amenities} onChange={(value) => setDraft((current) => ({ ...current, amenities: value }))} textarea />
        <Field label="Kosher info" value={draft.kosherInfo} onChange={(value) => setDraft((current) => ({ ...current, kosherInfo: value }))} textarea />
      </div>
      <Field label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} textarea />
      <div className="mt-4 flex flex-wrap gap-3">
        <input value={draft.lastVerified} onChange={(event) => setDraft((current) => ({ ...current, lastVerified: event.target.value }))} placeholder="Last verified" className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm" />
        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as EditableAccommodation["status"] }))} className="border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
          <option value="draft">Draft</option>
          <option value="needs-review">Needs review</option>
          <option value="published">Published</option>
        </select>
        <button type="button" disabled={saving} onClick={() => onSave(draft)} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] disabled:opacity-60">Save accommodation</button>
      </div>
    </article>
  );
}
