import AreaGate from "@/components/AreaGate";

// Every screen in this folder belongs to the "advertisements" area. See
// lib/admin-permissions.ts for what that means and who is narrowed to it.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="advertisements">{children}</AreaGate>;
}
