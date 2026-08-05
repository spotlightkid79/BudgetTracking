const RATES_STORAGE_KEY = 'budget-tracker-eur-rates';

/** Historical TRY->EUR rates keyed by yyyy-mm-dd. */
export type RateMap = Record<string, number>;

export function loadCachedRates(): RateMap {
  try {
    const raw = localStorage.getItem(RATES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RateMap) : {};
  } catch {
    return {};
  }
}

export function saveCachedRates(rates: RateMap): void {
  localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
}

function shiftDateStr(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ECB (and so Frankfurter) publishes no weekend/holiday rates, so an exact-date
 * lookup often misses. Walk outward a couple of weeks, preferring earlier dates
 * (the last known rate before that day) over later ones.
 */
export function findNearestRate(rates: RateMap, date: string): number | undefined {
  if (rates[date] !== undefined) return rates[date];
  for (let i = 1; i <= 14; i++) {
    const earlier = shiftDateStr(date, -i);
    if (rates[earlier] !== undefined) return rates[earlier];
  }
  for (let i = 1; i <= 14; i++) {
    const later = shiftDateStr(date, i);
    if (rates[later] !== undefined) return rates[later];
  }

  // Dates further out (future projections like salary estimates or recurring
  // rules) will never get a published rate — fall back to whatever cached
  // rate is chronologically closest rather than leaving the amount unconverted.
  const keys = Object.keys(rates);
  if (keys.length === 0) return undefined;
  const target = new Date(`${date}T00:00:00`).getTime();
  let closestKey = keys[0];
  let closestDiff = Math.abs(target - new Date(`${closestKey}T00:00:00`).getTime());
  for (const key of keys) {
    const diff = Math.abs(target - new Date(`${key}T00:00:00`).getTime());
    if (diff < closestDiff) {
      closestKey = key;
      closestDiff = diff;
    }
  }
  return rates[closestKey];
}

interface FrankfurterRangeResponse {
  rates: Record<string, { EUR: number }>;
}

/** Fetches ECB reference TRY->EUR rates for every published day in [start, end]. */
export async function fetchRatesRange(start: string, end: string): Promise<RateMap> {
  const res = await fetch(`https://api.frankfurter.dev/v1/${start}..${end}?from=TRY&to=EUR`);
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`);
  const json = (await res.json()) as FrankfurterRangeResponse;
  const rates: RateMap = {};
  for (const [date, value] of Object.entries(json.rates)) {
    rates[date] = value.EUR;
  }
  return rates;
}
