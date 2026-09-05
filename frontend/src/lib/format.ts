export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${currency}`;
  }
}

// Number of decimal digits each currency's minor unit represents (e.g. USD cents = 2).
// Mirrors backend/src/lib/parse.ts's CURRENCY_MINOR_UNIT_EXPONENTS — currencies not
// listed here fall back to 0 decimal places (matches VND, which has no subunit in use).
const MINOR_UNIT_EXPONENTS: Record<string, number> = {
  USD: 2,
  EUR: 2,
};

/** Formats an amount stored in minor units (e.g. USD cents) back into its major-unit display form. */
export function formatOriginalAmount(minorUnits: number, currency: string): string {
  const majorUnits = minorUnits / 10 ** (MINOR_UNIT_EXPONENTS[currency] ?? 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(majorUnits);
  } catch {
    return `${majorUnits.toLocaleString("en-US")} ${currency}`;
  }
}

/** Formats an exchange rate (1 unit of some currency = N VND) for display. */
export function formatExchangeRate(rate: number): string {
  return rate.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7);
}
