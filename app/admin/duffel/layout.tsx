import AreaGate from "@/components/AreaGate";

// The Duffel tools belong to the "money" area: this is the one screen on the
// site that can take a card and issue a ticket, so it sits with the earnings
// and finances rather than with the content.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="money">{children}</AreaGate>;
}
