import MoveFilesPanel from "@/components/admin/MoveFilesPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

/** The one-off copy of uploaded files off the old Railway hosts (18 November 2026). */
export default function MoveFilesPage() {
  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Move uploaded files" />
      </header>
      <div className="mt-6">
        <MoveFilesPanel />
      </div>
    </>
  );
}
