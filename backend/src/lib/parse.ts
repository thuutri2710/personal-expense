import type { Category, CreditExpenseMissingField } from "../types";

export type ParsedMessage = {
  // In minor units of `currency` when set (e.g. USD cents), otherwise minor units of
  // the default currency (VND has no subunit in practice, so this is whole VND).
  amount: number;
  description: string;
  // ISO 4217 code when the text carried an explicit non-default currency (e.g. "$20
  // lunch" -> "USD"); null when no currency was detected, meaning the default currency.
  currency: string | null;
};

// Recognized currency symbols/codes a user might type, mapped to ISO 4217 codes. Add
// more entries here (and to CURRENCY_MINOR_UNIT_EXPONENTS below) to support more
// currencies — no other parsing code needs to change.
export const CURRENCY_ALIASES: Record<string, string> = {
  "$": "USD",
  usd: "USD",
  "€": "EUR",
  eur: "EUR",
};

// Number of decimal digits each currency's minor unit represents (e.g. USD cents = 2).
// Currencies not listed here fall back to 0 decimal places.
export const CURRENCY_MINOR_UNIT_EXPONENTS: Record<string, number> = {
  USD: 2,
  EUR: 2,
};

const CURRENCY_SYMBOL_PATTERN = "[$€]";
const CURRENCY_CODE_PATTERN = "usd|eur";

// Matches an amount token like "50k", "150000", "1.5tr", "2m" ("k" = thousand,
// "tr"/"m" = million, VND shorthand), optionally preceded by a currency symbol
// ("$20") or followed by a currency code word ("20 usd").
const AMOUNT_TOKEN = new RegExp(
  `(${CURRENCY_SYMBOL_PATTERN})?\\s*(\\d+(?:[.,]\\d+)?)\\s*(k|tr|m)?\\b(?:\\s*(${CURRENCY_CODE_PATTERN})\\b)?`,
  "i",
);

// Applies the "k"/"tr"/"m" shorthand multiplier, without rounding to minor units yet
// (that depends on the target currency's number of decimal places).
function toMajorUnits(raw: string, unit: string | undefined): number {
  const value = Number(raw.replace(",", "."));
  switch (unit?.toLowerCase()) {
    case "k":
      return value * 1_000;
    case "tr":
    case "m":
      return value * 1_000_000;
    default:
      return value;
  }
}

function toNumber(raw: string, unit: string | undefined): number {
  return Math.round(toMajorUnits(raw, unit));
}

/**
 * Splits a free-text message into independent transaction segments on commas, e.g.
 * "50k coffee, 20k parking, 1.5tr rent" -> ["50k coffee", "20k parking", "1.5tr rent"].
 * A message with no comma is returned as a single segment, so single-transaction
 * parsing behaves exactly as before. Only splits on a comma followed by whitespace,
 * so a comma used as a decimal separator (e.g. "1,5tr rent", VN/EU style) stays intact.
 */
export function splitTransactionSegments(text: string): string[] {
  return text
    .split(/,\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * Parses free-text messages like "50k coffee", "150000 grab food", "coffee 50k",
 * "$20 lunch", or "20 usd lunch" into an amount + description + currency. The amount
 * is in minor units of the detected currency (or the default currency when none is
 * detected). Returns null if no amount token is found.
 */
export function parseExpenseMessage(text: string): ParsedMessage | null {
  const trimmed = text.trim();
  const match = trimmed.match(AMOUNT_TOKEN);
  if (!match || match.index === undefined) return null;

  const symbolOrCode = match[1] ?? match[4];
  const currency = symbolOrCode ? CURRENCY_ALIASES[symbolOrCode.toLowerCase()] ?? null : null;

  const majorValue = toMajorUnits(match[2], match[3]);
  const amount = currency
    ? Math.round(majorValue * 10 ** (CURRENCY_MINOR_UNIT_EXPONENTS[currency] ?? 0))
    : Math.round(majorValue);
  if (!amount || amount <= 0) return null;

  const description = (
    trimmed.slice(0, match.index) + trimmed.slice(match.index + match[0].length)
  ).trim();

  return {
    amount,
    description: description || "Expense",
    currency,
  };
}

export type CreditParseResult =
  | {
      complete: true;
      totalAmount: number;
      months: number;
      startMonth: string; // YYYY-MM
      description: string;
    }
  | { complete: false; missing: CreditExpenseMissingField[] };

// Words that signal "this is an installment/credit purchase" rather than a one-off expense.
const CREDIT_KEYWORD_PATTERN = /\b(installments?|credit\s*plan)\b|trả\s*góp|tra\s*gop|\bgóp\b|\bgop\b/i;

// "for 12 months", "in 6 months", "trong 12 tháng", "12 tháng"
const DURATION_PATTERN = /\b(?:in|for|trong)?\s*(\d+)\s*(?:months?|mo\b|tháng|thang)\b/i;

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function toStartMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Tries a series of "start month" phrasings, in both English and Vietnamese, against
// the text. Returns the matched YYYY-MM plus the raw matched text (so the caller can
// strip it out of the description) — or null if none of the phrasings matched.
function extractStartMonth(text: string): { startMonth: string; raw: string } | null {
  const currentYear = new Date().getFullYear();

  const vnMonthNumber = text.match(
    /\b(?:từ|tu|bắt\s*đầu|bat\s*dau)\s*tháng\s*(\d{1,2})(?:[/-](\d{4}))?/i,
  );
  if (vnMonthNumber) {
    const month = Number(vnMonthNumber[1]);
    const year = vnMonthNumber[2] ? Number(vnMonthNumber[2]) : currentYear;
    if (month >= 1 && month <= 12) {
      return { startMonth: toStartMonth(year, month), raw: vnMonthNumber[0] };
    }
  }

  const isoDate = text.match(/\b(?:from|since|từ|tu)\s*(\d{4})-(\d{1,2})\b/i);
  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]);
    if (month >= 1 && month <= 12) {
      return { startMonth: toStartMonth(year, month), raw: isoDate[0] };
    }
  }

  const slashDate = text.match(/\b(?:from|since|từ|tu)\s*(\d{1,2})\/(\d{4})\b/i);
  if (slashDate) {
    const month = Number(slashDate[1]);
    const year = Number(slashDate[2]);
    if (month >= 1 && month <= 12) {
      return { startMonth: toStartMonth(year, month), raw: slashDate[0] };
    }
  }

  const monthName = text.match(/\b(?:from|since|starting)\s+([A-Za-z]+)\.?\s+(\d{4})\b/i);
  if (monthName) {
    const month = MONTH_NAMES[monthName[1].toLowerCase()];
    if (month) {
      return { startMonth: toStartMonth(Number(monthName[2]), month), raw: monthName[0] };
    }
  }

  return null;
}

/**
 * Recognizes free-text credit/installment expenses like "trả góp laptop 12tr
 * trong 12 tháng từ tháng 3/2026" or "installment phone 24m for 12 months from
 * March 2026". Returns null if the text doesn't look like a credit expense at
 * all (no installment keyword), so the caller can fall back to the regular
 * one-off expense parser. Returns `{ complete: false, missing }` when an
 * installment keyword is present but the amount, duration, or start month
 * can't be found, so the caller can ask the user for exactly what's missing.
 */
export function parseCreditExpenseMessage(text: string): CreditParseResult | null {
  const trimmed = text.trim();
  if (!CREDIT_KEYWORD_PATTERN.test(trimmed)) return null;

  let working = trimmed.replace(CREDIT_KEYWORD_PATTERN, " ");

  const startMonthMatch = extractStartMonth(working);
  if (startMonthMatch) {
    working = working.replace(startMonthMatch.raw, " ");
  }

  const durationMatch = working.match(DURATION_PATTERN);
  const months = durationMatch ? Number(durationMatch[1]) : null;
  if (durationMatch) {
    working = working.slice(0, durationMatch.index) + working.slice(durationMatch.index! + durationMatch[0].length);
  }

  const amountMatch = working.match(AMOUNT_TOKEN);
  const totalAmount = amountMatch ? toNumber(amountMatch[2], amountMatch[3]) : null;
  let description = working;
  if (amountMatch && amountMatch.index !== undefined) {
    description =
      working.slice(0, amountMatch.index) + working.slice(amountMatch.index + amountMatch[0].length);
  }
  description = description.replace(/\s+/g, " ").trim();

  const missing: CreditExpenseMissingField[] = [];
  if (!totalAmount || totalAmount <= 0) missing.push("amount");
  if (!months || months <= 0) missing.push("months");
  if (!startMonthMatch) missing.push("startMonth");

  if (missing.length > 0) {
    return { complete: false, missing };
  }

  return {
    complete: true,
    totalAmount: totalAmount!,
    months: months!,
    startMonth: startMonthMatch!.startMonth,
    description: description || "Credit expense",
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
