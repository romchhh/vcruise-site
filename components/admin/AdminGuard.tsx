"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, ready } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace(`/admin?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, session, router, pathname]);

  if (!ready) {
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <p style={{ color: "#6e6e6e", fontWeight: 600 }}>Завантаження…</p>
      </div>
    );
  }

  if (!session) return null;

  return children;
}
