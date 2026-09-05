import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { fxRates } from "../db/schema";

// Last-resort approximate rates (1 unit of currency = N VND), used only when both the
// D1 cache and the live FX API are unavailable. These drift over time — they only
// exist so a network hiccup or an unsupported historical date doesn't break parsing.
const FALLBACK_RATES: Record<string, number> = {
  USD: 25800,
  EUR: 30000,
};

export type FxRateLookup = {
  rate: number; // 1 unit of `currency` = `rate` VND, on the requested date
  source: "cache" | "api" | "fallback";
};

// Free, keyless historical FX API (https://github.com/fawazahmed0/exchange-api). Served
// off jsdelivr with no rate limits; `baseUrl` is swappable via the FX_API_BASE_URL env
// var. `${baseUrl}@<date>/v1/currencies/<currency>.json` returns that currency's rate
// against every other currency (including VND) on that date.
async function fetchRateFromApi(
  baseUrl: string,
  currencyLower: string,
  date: string,
): Promise<number | null> {
  const candidateUrls = [
    `${baseUrl}@${date}/v1/currencies/${currencyLower}.json`,
    // Same dataset, alternate host — used if the primary CDN is unreachable.
    `https://${date}.currency-api.pages.dev/v1/currencies/${currencyLower}.json`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, Record<string, number>>;
      const rate = data[currencyLower]?.vnd;
      if (typeof rate === "number" && rate > 0) return rate;
    } catch {
      // network error or unexpected payload — try the next candidate, then fall back
    }
  }

  return null;
}

/**
 * Resolves how many VND one unit of `currency` was worth on `date`. Checks the D1
 * `fx_rates` cache first, then a free historical-rate API, then a small hardcoded
 * fallback table — so one bad lookup never blocks parsing. Successful API lookups are
 * cached so repeated conversions for the same currency+date don't re-hit the network.
 */
export async function resolveFxRate(
  db: Db,
  baseUrl: string,
  currency: string,
  date: string,
): Promise<FxRateLookup> {
  const code = currency.toUpperCase();

  const cached = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.currency, code), eq(fxRates.date, date)))
    .get();
  if (cached) return { rate: cached.rate, source: "cache" };

  const apiRate = await fetchRateFromApi(baseUrl, code.toLowerCase(), date);
  if (apiRate !== null) {
    try {
      await db.insert(fxRates).values({ currency: code, date, rate: apiRate }).onConflictDoNothing();
    } catch {
      // best-effort cache write; a failure here shouldn't break the conversion itself
    }
    return { rate: apiRate, source: "api" };
  }

  return { rate: FALLBACK_RATES[code] ?? 1, source: "fallback" };
}
