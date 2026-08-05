import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchRatesRange,
  findNearestRate,
  loadCachedRates,
  saveCachedRates,
  todayStr,
  type RateMap,
} from './exchangeRates';

export type CurrencyCode = 'TRY' | 'EUR';

const CURRENCY_STORAGE_KEY = 'budget-tracker-currency';

interface CurrencyContextValue {
  /** Effective display currency — downgrades to TRY if EUR was picked but no rate has ever loaded. */
  currency: CurrencyCode;
  /** The user's actual preference, independent of whether rates are available (for the toggle control). */
  selectedCurrency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  /** Converts a TRY amount to the active currency using the rate for `date` (defaults to today). No-op in TRY mode. */
  convert: (amount: number, date?: string) => number;
  ratesReady: boolean;
  ratesError: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface DateRange {
  min: string;
  max: string;
}

function rangeOf(dates: string[]): DateRange {
  return {
    min: dates.reduce((a, b) => (a < b ? a : b)),
    max: dates.reduce((a, b) => (a > b ? a : b)),
  };
}

export function CurrencyProvider({ dates, children }: { dates: string[]; children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored === 'EUR' ? 'EUR' : 'TRY';
  });
  const [rates, setRates] = useState<RateMap>(loadCachedRates);
  const [fetchedRange, setFetchedRange] = useState<DateRange | null>(() => {
    const keys = Object.keys(rates);
    return keys.length > 0 ? rangeOf(keys) : null;
  });
  const [ratesReady, setRatesReady] = useState(Object.keys(rates).length > 0);
  const [ratesError, setRatesError] = useState(false);

  // If EUR was picked but no rate has ever loaded (offline on first run, API
  // unreachable), there's nothing to convert with — fall back to actually
  // showing TRY rather than labeling raw TRY digits with a euro sign.
  const currency: CurrencyCode = selectedCurrency === 'EUR' && Object.keys(rates).length === 0 ? 'TRY' : selectedCurrency;

  const setCurrency = useCallback((next: CurrencyCode) => {
    setSelectedCurrency(next);
    localStorage.setItem(CURRENCY_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    if (selectedCurrency !== 'EUR') return;

    const today = todayStr();
    const wantedDates = dates.length > 0 ? dates : [today];
    const wanted = rangeOf(wantedDates);
    const needMin = wanted.min > today ? today : wanted.min;
    const needMax = wanted.max > today ? today : wanted.max;

    const targetMin = fetchedRange && fetchedRange.min < needMin ? fetchedRange.min : needMin;
    const targetMax = fetchedRange && fetchedRange.max > needMax ? fetchedRange.max : needMax;

    if (fetchedRange && targetMin === fetchedRange.min && targetMax === fetchedRange.max) {
      setRatesReady(true);
      return;
    }

    let cancelled = false;
    fetchRatesRange(targetMin, targetMax)
      .then((fetched) => {
        if (cancelled) return;
        setRates((prev) => {
          const merged = { ...prev, ...fetched };
          saveCachedRates(merged);
          return merged;
        });
        setFetchedRange({ min: targetMin, max: targetMax });
        setRatesReady(true);
        setRatesError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRatesError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, dates, fetchedRange]);

  const convert = useCallback(
    (amount: number, date?: string) => {
      if (currency === 'TRY') return amount;
      const rate = findNearestRate(rates, date ?? todayStr());
      return rate !== undefined ? amount * rate : amount;
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, selectedCurrency, setCurrency, convert, ratesReady, ratesError }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
