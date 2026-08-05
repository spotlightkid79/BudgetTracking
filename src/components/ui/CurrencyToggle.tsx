import { useCurrency } from '../../lib/currency/CurrencyContext';
import { useLanguage } from '../../lib/i18n/LanguageContext';

const SYMBOLS = { TRY: '₺', EUR: '€' } as const;

export function CurrencyToggle({ collapsed }: { collapsed?: boolean }) {
  const { selectedCurrency, setCurrency, ratesReady, ratesError } = useCurrency();
  const { t } = useLanguage();
  const next = selectedCurrency === 'TRY' ? 'EUR' : 'TRY';
  const loading = selectedCurrency === 'EUR' && !ratesReady && !ratesError;
  const failed = selectedCurrency === 'EUR' && ratesError && !ratesReady;

  return (
    <button
      onClick={() => setCurrency(next)}
      title={collapsed ? t(`app.currency${next}`) : failed ? t('app.ratesError') : undefined}
      className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
        collapsed ? 'justify-center px-2' : 'px-3'
      }`}
    >
      <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
        {SYMBOLS[selectedCurrency]}
      </span>
      {!collapsed && (
        <span className="flex items-center gap-1.5">
          {t(`app.currency${next}`)}
          {loading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />}
          {failed && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title={t('app.ratesError')} />}
        </span>
      )}
    </button>
  );
}

/** Compact icon-only variant for the mobile header row. */
export function CurrencyToggleIcon() {
  const { selectedCurrency, setCurrency, ratesReady, ratesError } = useCurrency();
  const { t } = useLanguage();
  const next = selectedCurrency === 'TRY' ? 'EUR' : 'TRY';
  const failed = selectedCurrency === 'EUR' && ratesError && !ratesReady;

  return (
    <button
      onClick={() => setCurrency(next)}
      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label={t(`app.currency${next}`)}
      title={failed ? t('app.ratesError') : undefined}
    >
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-[10px] font-bold">
        {SYMBOLS[selectedCurrency]}
      </span>
    </button>
  );
}
