import { useMemo, useState } from 'react';
import type { BudgetData } from '../types';
import { MonthSwitcher } from './ui/MonthSwitcher';
import { formatCurrency, monthKeyOf } from '../lib/format';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface BudgetsPageProps {
  data: BudgetData;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onSetBudget: (categoryId: string, limit: number) => void;
  onRemoveBudget: (categoryId: string) => void;
}

export function BudgetsPage({
  data,
  monthKey,
  onMonthChange,
  onSetBudget,
  onRemoveBudget,
}: BudgetsPageProps) {
  const { t } = useLanguage();
  const expenseCategories = useMemo(
    () => data.categories.filter((c) => c.type === 'expense'),
    [data.categories]
  );

  const monthExpenses = useMemo(
    () => data.transactions.filter((t) => t.type === 'expense' && monthKeyOf(t.date) === monthKey),
    [data.transactions, monthKey]
  );

  const budgetByCategory = useMemo(
    () => new Map(data.budgets.map((b) => [b.categoryId, b])),
    [data.budgets]
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function spentFor(categoryId: string) {
    return monthExpenses
      .filter((t) => t.categoryId === categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function handleSave(categoryId: string) {
    const raw = drafts[categoryId];
    const value = parseFloat(raw);
    if (!isNaN(value) && value > 0) {
      onSetBudget(categoryId, value);
      setDrafts((d) => ({ ...d, [categoryId]: '' }));
    }
  }

  const totalLimit = data.budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = data.budgets.reduce((sum, b) => sum + spentFor(b.categoryId), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('budgets.title')}</h1>
        <MonthSwitcher monthKey={monthKey} onChange={onMonthChange} />
      </div>

      {data.budgets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('budgets.totalBudgeted')}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {formatCurrency(totalSpent)} / {formatCurrency(totalLimit)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${totalSpent > totalLimit ? 'bg-rose-500' : 'bg-indigo-500'}`}
              style={{ width: `${totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {expenseCategories.map((category) => {
          const budget = budgetByCategory.get(category.id);
          const spent = spentFor(category.id);
          const percent = budget && budget.monthlyLimit > 0
            ? Math.min(100, (spent / budget.monthlyLimit) * 100)
            : 0;
          const over = budget ? spent > budget.monthlyLimit : false;

          return (
            <div
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {category.name}
                </span>
              </div>

              {budget ? (
                <>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={over ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                      {t('budgets.spentOfLimit', {
                        spent: formatCurrency(spent),
                        limit: formatCurrency(budget.monthlyLimit),
                      })}
                    </span>
                    <span className="text-slate-400">{Math.round(percent)}%</span>
                  </div>
                  <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('budgets.newLimit')}
                      value={drafts[category.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [category.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => handleSave(category.id)}
                      className="shrink-0 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {t('budgets.update')}
                    </button>
                    <button
                      onClick={() => onRemoveBudget(category.id)}
                      className="shrink-0 rounded-lg bg-rose-50 px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                    >
                      {t('budgets.remove')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('budgets.setMonthlyLimit')}
                    value={drafts[category.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [category.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={() => handleSave(category.id)}
                    className="shrink-0 rounded-lg bg-indigo-600 px-2.5 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    {t('budgets.set')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
