import type { ChatConversation } from "./chat";
import { uid, updateDb, type Lead } from "./store";

const CHAT_LEAD_SOURCE = "Онлайн-чат";

/** Зберігає або оновлює заявку з контактами з діалогу чату. */
export function upsertLeadFromChatConversation(
  conversation: ChatConversation,
): Lead | null {
  const phone = conversation.visitorPhone.trim();
  if (!phone) return null;

  const name = conversation.visitorName.trim() || "Гість чату";
  const now = new Date().toISOString();
  let result: Lead | null = null;

  updateDb((db) => {
    const index = db.leads.findIndex(
      (lead) =>
        lead.meta?.chatConversationId === conversation.id ||
        (lead.source === CHAT_LEAD_SOURCE &&
          lead.phone === phone &&
          lead.meta?.chatConversationId === conversation.id),
    );

    if (index >= 0) {
      const current = db.leads[index];
      const updated: Lead = {
        ...current,
        name: name || current.name,
        phone,
        page: conversation.page || current.page,
        updatedAt: now,
        meta: {
          ...current.meta,
          chatConversationId: conversation.id,
        },
      };
      db.leads[index] = updated;
      result = updated;
      return;
    }

    const byPhone = db.leads.find(
      (lead) => lead.source === CHAT_LEAD_SOURCE && lead.phone === phone,
    );
    if (byPhone) {
      const idx = db.leads.indexOf(byPhone);
      const updated: Lead = {
        ...byPhone,
        name: name || byPhone.name,
        page: conversation.page || byPhone.page,
        updatedAt: now,
        meta: {
          ...byPhone.meta,
          chatConversationId: conversation.id,
        },
      };
      db.leads[idx] = updated;
      result = updated;
      return;
    }

    const lead: Lead = {
      id: uid("lead"),
      name,
      phone,
      email: "",
      source: CHAT_LEAD_SOURCE,
      cruise: "",
      status: "new",
      notes: `Чат: ${conversation.id}`,
      details: conversation.lastPreview || "",
      createdAt: now,
      updatedAt: now,
      page: conversation.page,
      meta: { chatConversationId: conversation.id },
    };
    db.leads.unshift(lead);
    result = lead;
  });

  return result;
}
