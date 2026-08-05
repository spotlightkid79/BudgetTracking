import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import type { BudgetData, Transaction } from '../types';
import { TransactionForm } from './TransactionForm';
import { StatCard } from './ui/StatCard';
import { formatCurrency, formatCurrencyCompact } from '../lib/format';
import {
  dateKey,
  endOfWeek,
  format,
  getMonthGrid,
  getWeekDays,
  isSameMonth,
  isToday,
  shiftAnchor,
  startOfWeek,
  WEEK_STARTS_ON,
} from '../lib/calendarUtils';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { categoryDisplayName } from '../lib/categoryName';

interface CalendarPageProps {
  data: BudgetData;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

type ViewMode = 'month' | 'week';

// teal / rose — validated for CVD & contrast in both light and dark surfaces
const POSITIVE_COLOR = '#0d9488';
const NEGATIVE_COLOR = '#e11d48';

export function CalendarPage({ data, onAdd, onUpdate, onDelete }: CalendarPageProps) {
  const { t, dateLocale } = useLanguage();
  const WEEKDAY_LABELS = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(new Date(2026, 0, 5 + i), 'EEE', { locale: dateLocale }) // Jan 5 2026 is a Monday
      ),
    [dateLocale]
  );
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(dateKey(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);

  const categoryById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of data.transactions) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [data.transactions]);

  function dayTotals(key: string) {
    const list = byDate.get(key) ?? [];
    const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, transactions: list };
  }

  const visibleDays = viewMode === 'month' ? getMonthGrid(anchor) : getWeekDays(anchor);

  const periodTotals = useMemo(() => {
    const daysInPeriod =
      viewMode === 'month' ? visibleDays.filter((d) => isSameMonth(d, anchor)) : visibleDays;
    return daysInPeriod.reduce(
      (acc, d) => {
        const { income, expense } = dayTotals(dateKey(d));
        acc.income += income;
        acc.expense += expense;
        return acc;
      },
      { income: 0, expense: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDays, byDate, viewMode, anchor]);

  const chartData = useMemo(
    () =>
      visibleDays.map((d) => ({
        key: dateKey(d),
        label: format(d, viewMode === 'month' ? 'd' : 'EEE d', { locale: dateLocale }),
        net: Math.round(dayTotals(dateKey(d)).net),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleDays, byDate, viewMode, dateLocale]
  );

  const periodLabel =
    viewMode === 'month'
      ? format(anchor, 'MMMM yyyy', { locale: dateLocale })
      : `${format(startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }), 'MMM d', { locale: dateLocale })} – ${format(
          endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
          'MMM d, yyyy',
          { locale: dateLocale }
        )}`;

  function openAdd(dateStr: string) {
    setEditing(undefined);
    setFormDate(dateStr);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setFormDate(undefined);
    setFormOpen(true);
  }

  function handleSubmit(tx: Omit<Transaction, 'id'>) {
    if (editing) {
      onUpdate({ ...tx, id: editing.id });
    } else {
      onAdd(tx);
    }
  }

  const selected = dayTotals(selectedKey);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('calendar.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {(['month', 'week'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {mode === 'month' ? t('calendar.month') : t('calendar.week')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setAnchor((a) => shiftAnchor(a, viewMode, -1))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label={t('common.previous')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="px-2 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
            >
              {t('common.today')}
            </button>
            <span className="min-w-[14ch] text-center text-sm font-medium text-slate-700 dark:text-slate-200">
              {periodLabel}
            </span>
            <button
              onClick={() => setAnchor((a) => shiftAnchor(a, viewMode, 1))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label={t('common.next')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('calendar.income')} value={formatCurrency(periodTotals.income)} icon={<ArrowUpCircle size={22} />} tone="positive" />
        <StatCard label={t('calendar.expenses')} value={formatCurrency(periodTotals.expense)} icon={<ArrowDownCircle size={22} />} tone="negative" />
        <StatCard
          label={t('calendar.net')}
          value={formatCurrency(periodTotals.income - periodTotals.expense)}
          icon={<Scale size={22} />}
          tone={periodTotals.income - periodTotals.expense >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {viewMode === 'week' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('calendar.dailyNetThisWeek')}
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" width={70} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Bar dataKey="net" radius={[4, 4, 4, 4]}>
                {chartData.map((d) => (
                  <Cell key={d.key} fill={d.net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'month' ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {visibleDays.map((day) => {
                const key = dateKey(day);
                const { income, expense } = dayTotals(key);
                const inMonth = isSameMonth(day, anchor);
                const today = isToday(day);
                const selected = key === selectedKey;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`flex min-h-[72px] min-w-0 flex-col items-start gap-0.5 overflow-hidden border-b border-r border-slate-100 p-1 text-left transition last:border-r-0 dark:border-slate-700 sm:min-h-[84px] sm:gap-1 sm:p-2 ${
                      inMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-900/40'
                    } ${selected ? 'ring-2 ring-inset ring-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium sm:h-6 sm:w-6 sm:text-xs ${
                        today
                          ? 'bg-indigo-600 text-white'
                          : inMonth
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {format(day, 'd', { locale: dateLocale })}
                    </span>
                    {income > 0 && (
                      <span className="w-full truncate text-[9px] font-medium text-emerald-600 dark:text-emerald-400 sm:text-[11px]">
                        +{formatCurrencyCompact(income)}
                      </span>
                    )}
                    {expense > 0 && (
                      <span className="w-full truncate text-[9px] font-medium text-rose-600 dark:text-rose-400 sm:text-[11px]">
                        -{formatCurrencyCompact(expense)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {format(new Date(selectedKey), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
              </h2>
              <button
                onClick={() => openAdd(selectedKey)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus size={14} /> {t('calendar.add')}
              </button>
            </div>
            {selected.transactions.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">{t('calendar.noTransactionsOnThisDay')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {selected.transactions.map((tx) => {
                  const category = categoryById.get(tx.categoryId);
                  return (
                    <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category?.color ?? '#94a3b8' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {category ? categoryDisplayName(category, t) : t('common.unknown')}
                          {tx.note && <span className="text-slate-400"> · {tx.note}</span>}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                      <button
                        onClick={() => openEdit(tx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                        aria-label={t('common.edit')}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {visibleDays.map((day) => {
            const key = dateKey(day);
            const { income, expense, net, transactions } = dayTotals(key);
            const today = isToday(day);
            return (
              <div
                key={key}
                className={`flex flex-col rounded-2xl border bg-white dark:bg-slate-800 ${
                  today ? 'border-indigo-300 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {format(day, 'EEE', { locale: dateLocale })}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        today ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {format(day, 'MMM d', { locale: dateLocale })}
                    </p>
                  </div>
                  <button
                    onClick={() => openAdd(key)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700"
                    aria-label={t('calendar.addTransaction')}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <ul className="flex-1 divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.length === 0 ? (
                    <li className="px-3 py-4 text-center text-xs text-slate-400">{t('calendar.noActivity')}</li>
                  ) : (
                    transactions.map((tx) => {
                      const category = categoryById.get(tx.categoryId);
                      return (
                        <li key={tx.id} className="group px-3 py-2" title={category ? categoryDisplayName(category, t) : t('common.unknown')}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: category?.color ?? '#94a3b8' }}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                              {category ? categoryDisplayName(category, t) : t('common.unknown')}
                            </span>
                            <button
                              onClick={() => openEdit(tx)}
                              className="hidden shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 group-hover:block dark:hover:text-slate-200"
                              aria-label={t('common.edit')}
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => onDelete(tx.id)}
                              className="hidden shrink-0 rounded p-0.5 text-slate-400 hover:text-rose-600 group-hover:block"
                              aria-label={t('common.delete')}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
                {(income > 0 || expense > 0) && (
                  <div className="border-t border-slate-100 px-3 py-2 text-right text-xs font-semibold dark:border-slate-700">
                    <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatCurrency(net)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <TransactionForm
          categories={data.categories}
          initial={editing}
          defaultDate={formDate}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
