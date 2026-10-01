import { siTelegram, siViber } from "simple-icons";
import type { MessengerId } from "@/lib/messengers";

export const messengerBrandIcons = {
  telegram: siTelegram,
  viber: siViber,
} satisfies Record<MessengerId, typeof siTelegram>;

export function messengerBrandHex(id: MessengerId) {
  return `#${messengerBrandIcons[id].hex}`;
}
