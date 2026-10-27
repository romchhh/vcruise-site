import { CURRENCY_SYMBOL } from "./constants";
import { formatMoney } from "./utils";
import type { CurrencyCode } from "./types";

export function formatDisplayPrice(
  amount: number,
  currency: CurrencyCode,
): string {
  return `${formatMoney(amount)} ${CURRENCY_SYMBOL[currency]}`;
}
