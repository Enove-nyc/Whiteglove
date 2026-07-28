import type { Metadata } from "next";
import AdminToolbar from "@/components/AdminToolbar";
import IdleLogout from "@/components/IdleLogout";

// The admin area is its own installable app: a separate "White Glove Admin"
// home-screen icon (scoped to /admin) that opens straight to the dashboard,
// distinct from the public app. This overrides the site-wide manifest here.
export const metadata: Metadata = {
  title: "White Glove Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "WG Admin" },
  icons: { icon: [{ url: "/icon-admin-192.png", sizes: "192x192", type: "image/png" }] },
};

// Auto sign-out of the admin area after 20 minutes of inactivity, so /admin
// requires the code again rather than staying open indefinitely.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The "go to" bar rides on every admin page, so nothing is more than two
  // keystrokes away no matter which screen you happen to be on.
  return (
    <>
      <AdminToolbar />
      {children}
      <IdleLogout minutes={20} endpoint="/api/admin/logout" redirectTo="/admin/login" />
    </>
  );
}
