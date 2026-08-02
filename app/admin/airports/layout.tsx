import AreaGate from "@/components/AreaGate";

// Every screen in this folder belongs to the "directory" area — an airport is
// a place, like a kever or a hotel. See lib/admin-permissions.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="directory">{children}</AreaGate>;
}
