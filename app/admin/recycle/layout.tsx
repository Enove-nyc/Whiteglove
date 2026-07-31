import AreaGate from "@/components/AreaGate";

// Every screen in this folder belongs to the "directory" area — most of what
// the bin holds is directory records, and the advertisements inside it are
// filtered again per row. See lib/admin-permissions.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="directory">{children}</AreaGate>;
}
