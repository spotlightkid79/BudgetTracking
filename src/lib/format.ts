export type CurrencyCode = 'TRY' | 'EUR';

const CURRENCY_LOCALES: Record<CurrencyCode, string> = { TRY: 'tr-TR', EUR: 'de-DE' };

function buildFormatters(maximumFractionDigits: number): Record<CurrencyCode, Intl.NumberFormat> {
  return {
    TRY: new Intl.NumberFormat(CURRENCY_LOCALES.TRY, { style: 'currency', currency: 'TRY', maximumFractionDigits }),
    EUR: new Intl.NumberFormat(CURRENCY_LOCALES.EUR, { style: 'currency', currency: 'EUR', maximumFractionDigits }),
  };
}

const fullFormatters = buildFormatters(2);
const compactFormatters = buildFormatters(0);

export function formatCurrency(amount: number, currency: CurrencyCode = 'TRY'): string {
  return fullFormatters[currency].format(amount);
}

/** Whole-number currency for tight spaces like calendar day cells. */
export function formatCurrencyCompact(amount: number, currency: CurrencyCode = 'TRY'): string {
  return compactFormatters[currency].format(amount);
}

export function formatMonthLabel(monthKey: string, locale = 'en-US'): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date().toISOString());
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
