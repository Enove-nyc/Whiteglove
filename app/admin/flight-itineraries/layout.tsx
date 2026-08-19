import AreaGate from "@/components/AreaGate";

// Flight itineraries belong to the "money" area, alongside Duffel and the
// travel providers: they are the flights the owner sells, written up for a
// customer, not part of the site's public content.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="money">{children}</AreaGate>;
}
