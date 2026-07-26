import IdleLogout from "@/components/IdleLogout";

// Auto sign-out of the admin area after 20 minutes of inactivity, so /admin
// requires the code again rather than staying open indefinitely.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <IdleLogout minutes={20} endpoint="/api/admin/logout" redirectTo="/admin/login" />
    </>
  );
}
