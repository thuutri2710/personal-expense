import type { Category } from "../types";

export type ParsedMessage = {
  amount: number;
  description: string;
};

// Matches an amount token like "50k", "150000", "1.5tr", "2m", optionally
// with a decimal point/comma. "k" = thousand, "tr"/"m" = million (VND shorthand).
const AMOUNT_TOKEN = /(\d+(?:[.,]\d+)?)\s*(k|tr|m)?\b/i;

function toNumber(raw: string, unit: string | undefined): number {
  const value = Number(raw.replace(",", "."));
  switch (unit?.toLowerCase()) {
    case "k":
      return Math.round(value * 1_000);
    case "tr":
    case "m":
      return Math.round(value * 1_000_000);
    default:
      return Math.round(value);
  }
}

/**
 * Parses free-text messages like "50k coffee", "150000 grab food", or
 * "coffee 50k" into an amount + description. Returns null if no amount
 * token is found.
 */
export function parseExpenseMessage(text: string): ParsedMessage | null {
  const trimmed = text.trim();
  const match = trimmed.match(AMOUNT_TOKEN);
  if (!match || match.index === undefined) return null;

  const amount = toNumber(match[1], match[2]);
  if (!amount || amount <= 0) return null;

  const description = (
    trimmed.slice(0, match.index) + trimmed.slice(match.index + match[0].length)
  ).trim();

  return {
    amount,
    description: description || "Expense",
  };
}

const KEYWORD_HINTS: Record<string, string[]> = {
  "Food & Drink": ["coffee", "cafe", "cà phê", "lunch", "dinner", "breakfast", "food", "ăn", "trà sữa", "restaurant"],
  Groceries: ["grocery", "groceries", "market", "chợ", "siêu thị", "supermarket"],
  Transport: ["grab", "taxi", "uber", "gas", "xăng", "bus", "parking", "gửi xe"],
  Shopping: ["shopee", "shopping", "clothes", "mua sắm", "lazada"],
  "Bills & Utilities": ["bill", "electric", "electricity", "water", "internet", "rent", "hóa đơn", "tiền nhà"],
  Entertainment: ["movie", "netflix", "game", "cinema", "phim"],
  Health: ["pharmacy", "doctor", "medicine", "thuốc", "gym"],
};

/** Simple keyword-based category guess. Returns null if no keyword matches. */
export function guessCategoryByKeyword(
  description: string,
  knownCategories: Category[],
): Category | null {
  const lower = description.toLowerCase();

  for (const [categoryName, keywords] of Object.entries(KEYWORD_HINTS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const match = knownCategories.find((c) => c.name === categoryName);
      if (match) return match;
    }
  }

  return null;
}
