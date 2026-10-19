import type { Metadata } from "next";
import "./admin.css";
import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";

export const metadata: Metadata = {
  title: "VCRUISE Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="vcruise-admin">
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </div>
  );
}
