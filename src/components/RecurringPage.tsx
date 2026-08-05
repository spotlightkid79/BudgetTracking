import { useMemo, useState } from 'react';
import { Plus, Repeat, Trash2 } from 'lucide-react';
import type { BudgetData, RecurringTransaction } from '../types';
import { RecurringForm } from './RecurringForm';
import { formatCurrency } from '../lib/format';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { categoryDisplayName } from '../lib/categoryName';

interface RecurringPageProps {
  data: BudgetData;
  onAdd: (rule: Omit<RecurringTransaction, 'id' | 'lastAppliedDate'>) => void;
  onDelete: (id: string) => void;
}

export function RecurringPage({ data, onAdd, onDelete }: RecurringPageProps) {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const categoryById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('recurring.title')}</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus size={16} /> {t('recurring.addRule')}
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{t('recurring.description')}</p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {data.recurring.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">{t('recurring.empty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.recurring.map((rule) => {
              const category = categoryById.get(rule.categoryId);
              return (
                <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    <Repeat size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {category ? categoryDisplayName(category, t) : t('common.unknown')}
                      {rule.note && <span className="text-slate-400"> · {rule.note}</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t(`recurring.${rule.frequency}`)} · {t('recurring.starts')} {rule.startDate}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      rule.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {rule.type === 'income' ? '+' : '-'}
                    {formatCurrency(rule.amount)}
                  </span>
                  <button
                    onClick={() => onDelete(rule.id)}
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

      {formOpen && (
        <RecurringForm categories={data.categories} onSubmit={onAdd} onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}
