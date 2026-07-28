import type { Metadata } from "next";
import AdminShell from "@/components/AdminShell";
import IdleLogout from "@/components/IdleLogout";

// The admin area is its own installable app: a separate "White Glove Admin"
// home-screen icon (scoped to /admin) that opens straight to the dashboard,
// distinct from the public app. This overrides the site-wide manifest here.
export const metadata: Metadata = {
  title: "White Glove Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "WG Admin" },
  icons: { icon: [{ url: "/icon-admin-192.png", sizes: "192x192", type: "image/png" }] },
  robots: { index: false, follow: false },
};

// Every admin screen sits inside the shell — five sections down the left, a
// "go to" box, no visitor navigation and no public footer. Auto sign-out after
// 20 minutes of inactivity, so /admin asks for the code again rather than
// staying open on a shared screen.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminShell>{children}</AdminShell>
      <IdleLogout minutes={20} endpoint="/api/admin/logout" redirectTo="/admin/login" />
    </>
  );
}
