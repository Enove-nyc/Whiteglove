import AreaGate from "@/components/AreaGate";

// The log holds both directory and content edits, and each row is filtered
// again by area inside the screen. Gated on "content" because the wording of a
// page is the most sensitive thing in it. See lib/admin-permissions.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="content">{children}</AreaGate>;
}
