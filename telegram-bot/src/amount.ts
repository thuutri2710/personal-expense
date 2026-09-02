// Same VND shorthand as the backend's full-message parser (k/tr/m suffixes),
// but for a reply that's expected to contain only a corrected amount.
const AMOUNT_ONLY = /^\s*(\d+(?:[.,]\d+)?)\s*(k|tr|m)?\s*$/i;

export function parseAmountOnly(text: string): number | null {
  const match = text.match(AMOUNT_ONLY);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  const unit = match[2]?.toLowerCase();
  const amount =
    unit === "k" ? value * 1_000 : unit === "tr" || unit === "m" ? value * 1_000_000 : value;

  return amount > 0 ? Math.round(amount) : null;
}
