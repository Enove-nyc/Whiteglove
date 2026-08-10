import AreaGate from "@/components/AreaGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="content">{children}</AreaGate>;
}
