import AreaGate from "@/components/AreaGate";

// Travel providers belong to the "money" area, for the same reason the Duffel
// screens do: the column on this page decides which company's inventory a
// visitor is shown, which is a commercial decision, not a content one.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="money">{children}</AreaGate>;
}
