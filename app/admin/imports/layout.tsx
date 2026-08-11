import AreaGate from "@/components/AreaGate";

// Bulk source records can turn into public listings, so they belong with the
// directory rather than the general pages/content area.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="directory">{children}</AreaGate>;
}
