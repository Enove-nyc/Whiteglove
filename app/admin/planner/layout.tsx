import AreaGate from "@/components/AreaGate";

// The planner's figures belong to the "directory" area, alongside the airports
// and the border crossings — they are all the same thing seen from different
// ends: what the site knows about getting from one place to another.
// See lib/admin-permissions.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="directory">{children}</AreaGate>;
}
