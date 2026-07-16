export interface Money {
  amount: number;
  currency: string;
}

/** Marketplace listings and transfers use Myanmar Kyat. */
export const MARKET_CURRENCY = "MMK" as const;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount);
}

/** Display amount the same way product cards / chat do: `1,234 MMK`. */
export function formatMarketAmount(amount: number): string {
  if (!Number.isFinite(amount)) return `0 ${MARKET_CURRENCY}`;
  return `${Math.round(amount).toLocaleString("en-US")} ${MARKET_CURRENCY}`;
}

/** Strip to digit-only string for form state / API payload. */
export function parsePriceInputDigits(raw: string, maxDigits = 12): string {
  return raw.replace(/\D/g, "").slice(0, maxDigits);
}

/** Thousand-separated display while typing (empty → ""). */
export function formatPriceInputDisplay(digits: string): string {
  const cleaned = parsePriceInputDigits(digits);
  if (!cleaned) return "";
  return Number(cleaned).toLocaleString("en-US");
}

export function priceDigitsToNumber(digits: string): number {
  const cleaned = parsePriceInputDigits(digits);
  if (!cleaned) return NaN;
  return Number(cleaned);
}
