import AreaGate from "@/components/AreaGate";

// Filed under "access", beside the visitor accounts, and for the same reason:
// these hold a traveller's name, email address and phone number. A helper
// granted the words and pictures has no business reading somebody's enquiry.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaGate area="access">{children}</AreaGate>;
}
