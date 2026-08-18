import AreaGate from "@/components/AreaGate";

// Same area as Towns: both are the destination directory, one heritage and one
// holiday. See lib/admin-permissions.ts for what that means and who is
// narrowed to it.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="directory">{children}</AreaGate>;
}
