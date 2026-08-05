import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from 'lucide-react';
import type { BudgetData } from '../types';
import { StatCard } from './ui/StatCard';
import { MonthSwitcher } from './ui/MonthSwitcher';
import { formatCurrency, formatMonthLabel, monthKeyOf, shiftMonthKey } from '../lib/format';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { useCurrency } from '../lib/currency/CurrencyContext';
import { categoryDisplayName } from '../lib/categoryName';

interface DashboardProps {
  data: BudgetData;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
}

const TREND_PERIODS = [3, 6, 12] as const;
type TrendPeriod = (typeof TREND_PERIODS)[number];

export function Dashboard({ data, monthKey, onMonthChange }: DashboardProps) {
  const { t, intlLocale } = useLanguage();
  const { currency, convert } = useCurrency();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(6);
  const categoryById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories]
  );

  const monthTransactions = useMemo(
    () => data.transactions.filter((t) => monthKeyOf(t.date) === monthKey),
    [data.transactions, monthKey]
  );

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convert(t.amount, t.date), 0);
  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + convert(t.amount, t.date), 0);
  const net = income - expenses;

  const allTimeBalance = data.transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? convert(t.amount, t.date) : -convert(t.amount, t.date)),
    0
  );

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.type !== 'expense') continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + convert(t.amount, t.date));
    }
    return Array.from(totals.entries())
      .map(([categoryId, value]) => {
        const category = categoryById.get(categoryId);
        return {
          name: category ? categoryDisplayName(category, t) : t('common.unknown'),
          value,
          color: category?.color ?? '#94a3b8',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions, categoryById, t, convert]);

  const accountBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.type !== 'expense' || !t.accountId) continue;
      totals.set(t.accountId, (totals.get(t.accountId) ?? 0) + convert(t.amount, t.date));
    }
    return Array.from(totals.entries())
      .map(([accountId, value]) => {
        const account = data.accounts.find((a) => a.id === accountId);
        return {
          name: account?.name ?? t('common.unknown'),
          value,
          color: account?.color ?? '#94a3b8',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions, data.accounts, t, convert]);

  const trend = useMemo(() => {
    const months = Array.from({ length: trendPeriod }, (_, i) =>
      shiftMonthKey(monthKey, i - (trendPeriod - 1))
    );
    return months.map((mk) => {
      const txs = data.transactions.filter((t) => monthKeyOf(t.date) === mk);
      return {
        month: formatMonthLabel(mk, intlLocale).split(' ')[0],
        Income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.date), 0),
        Expenses: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.date), 0),
      };
    });
  }, [data.transactions, monthKey, intlLocale, trendPeriod, convert]);

  const cumulativeTrend = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const byDay = new Map<number, { income: number; expense: number }>();
    for (const t of monthTransactions) {
      const day = Number(t.date.slice(8, 10));
      const entry = byDay.get(day) ?? { income: 0, expense: 0 };
      const converted = convert(t.amount, t.date);
      if (t.type === 'income') entry.income += converted;
      else entry.expense += converted;
      byDay.set(day, entry);
    }

    let cumIncome = 0;
    let cumExpense = 0;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const entry = byDay.get(day);
      if (entry) {
        cumIncome += entry.income;
        cumExpense += entry.expense;
      }
      return { day, Income: cumIncome, Expenses: cumExpense };
    });
  }, [monthTransactions, monthKey, convert]);

  const exceededDay = cumulativeTrend.find((d) => d.Expenses > d.Income)?.day;

  const budgetProgress = useMemo(() => {
    return data.budgets
      .map((b) => {
        const spent = monthTransactions
          .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + convert(t.amount, t.date), 0);
        const limit = convert(b.monthlyLimit);
        return {
          category: categoryById.get(b.categoryId),
          spent,
          limit,
          percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0,
          over: spent > limit,
        };
      })
      .filter((b) => b.category)
      .sort((a, b) => b.spent / (b.limit || 1) - a.spent / (a.limit || 1));
  }, [data.budgets, monthTransactions, categoryById, convert]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.title')}</h1>
        <MonthSwitcher monthKey={monthKey} onChange={onMonthChange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.income')}
          value={formatCurrency(income, currency)}
          icon={<ArrowUpCircle size={22} />}
          tone="positive"
        />
        <StatCard
          label={t('dashboard.expenses')}
          value={formatCurrency(expenses, currency)}
          icon={<ArrowDownCircle size={22} />}
          tone="negative"
        />
        <StatCard
          label={t('dashboard.netThisMonth')}
          value={formatCurrency(net, currency)}
          icon={<Scale size={22} />}
          tone={net >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label={t('dashboard.overallBalance')}
          value={formatCurrency(allTimeBalance, currency)}
          icon={<Wallet size={22} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('dashboard.spendingByCategory')}
          </h2>
          {categoryBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">{t('dashboard.noExpensesThisMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {categoryBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('dashboard.incomeVsExpenses6mo')}
            </h2>
            <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              {TREND_PERIODS.map((period) => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    trendPeriod === period
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {t(`dashboard.period${period}mo`)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" width={60} tickFormatter={(v) => formatCurrency(v, currency)} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Income" name={t('common.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" name={t('common.expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.accounts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('dashboard.spendingByAccount')}
          </h2>
          {accountBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">{t('dashboard.noExpensesThisMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={accountBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {accountBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('dashboard.cumulativeChartTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {exceededDay
              ? t('dashboard.exceededOnDay', { day: exceededDay })
              : t('dashboard.notExceeded')}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cumulativeTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, cumulativeTrend.length]}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" width={70} tickFormatter={(v) => formatCurrency(v, currency)} />
            <Tooltip
              labelFormatter={(day) => t('dashboard.dayLabel', { day: day as number })}
              formatter={(v: unknown) => formatCurrency(Number(v), currency)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Income" name={t('common.income')} stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Expenses" name={t('common.expenses')} stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {budgetProgress.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('dashboard.budgetProgress')}
          </h2>
          <div className="space-y-4">
            {budgetProgress.map(({ category, spent, limit, percent, over }) => (
              <div key={category!.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {categoryDisplayName(category!, t)}
                  </span>
                  <span className={over ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                    {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
