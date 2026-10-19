import { Suspense } from "react";
import ChatView from "@/components/admin/pages/ChatView";

export default function AdminChatPage() {
  return (
    <Suspense fallback={<p>Завантаження…</p>}>
      <ChatView />
    </Suspense>
  );
}
