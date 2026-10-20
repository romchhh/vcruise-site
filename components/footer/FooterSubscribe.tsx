"use client";

import { useContactModal } from "@/components/contact/ContactModalProvider";
import { footerSubscribe } from "@/lib/footer-copy";

export default function FooterSubscribe() {
  const { openContactModal } = useContactModal();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <p className="text-body text-white/80">{footerSubscribe.text}</p>
      <button
        type="button"
        onClick={openContactModal}
        className="btn-secondary shrink-0"
      >
        {footerSubscribe.button}
      </button>
    </div>
  );
}
