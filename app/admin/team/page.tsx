import TeamEditor from "@/components/TeamEditor";
import { listTeam, ownerEmail, teamStorageAvailable } from "@/lib/admin-roles";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const members = await listTeam();
  const storageReady = teamStorageAvailable();
  const owner = ownerEmail();

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Team" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Let someone see the site while it is closed, or help you run it.
        </p>
      </header>

      {!owner && (
        <p className="mt-6 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Your own email is not recorded yet, so the &ldquo;that is you&rdquo; protection is off. Ask for{" "}
          <code>OWNER_EMAIL</code> to be set to your address on the deployment — it makes sure nothing on this screen
          can ever lock you out.
        </p>
      )}

      <div className="mt-8">
        <TeamEditor members={members} storageReady={storageReady} />
      </div>
    </>
  );
}
