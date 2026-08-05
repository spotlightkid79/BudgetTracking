import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { BudgetData, Transaction, TransactionType } from '../types';
import { TransactionForm } from './TransactionForm';
import { MonthSwitcher } from './ui/MonthSwitcher';
import { formatCurrency, monthKeyOf } from '../lib/format';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { useCurrency } from '../lib/currency/CurrencyContext';
import { categoryDisplayName } from '../lib/categoryName';

interface TransactionsPageProps {
  data: BudgetData;
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsPage({
  data,
  monthKey,
  onMonthChange,
  onAdd,
  onUpdate,
  onDelete,
}: TransactionsPageProps) {
  const { t } = useLanguage();
  const { currency, convert } = useCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [search, setSearch] = useState('');

  const categoryById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories]
  );

  const accountById = useMemo(
    () => new Map(data.accounts.map((a) => [a.id, a])),
    [data.accounts]
  );

  const filtered = useMemo(() => {
    return data.transactions
      .filter((t) => monthKeyOf(t.date) === monthKey)
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => categoryFilter === 'all' || t.categoryId === categoryFilter)
      .filter((t) => accountFilter === 'all' || t.accountId === accountFilter)
      .filter((t) => t.note.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, monthKey, typeFilter, categoryFilter, accountFilter, search]);

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setFormOpen(true);
  }

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function handleSubmit(tx: Omit<Transaction, 'id'>) {
    if (editing) {
      onUpdate({ ...tx, id: editing.id });
    } else {
      onAdd(tx);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('transactions.title')}</h1>
        <div className="flex items-center gap-3">
          <MonthSwitcher monthKey={monthKey} onChange={onMonthChange} />
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus size={16} /> {t('transactions.add')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('transactions.searchNotes')}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">{t('transactions.allTypes')}</option>
          <option value="income">{t('common.income')}</option>
          <option value="expense">{t('common.expense')}</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">{t('transactions.allCategories')}</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryDisplayName(c, t)}
            </option>
          ))}
        </select>
        {data.accounts.length > 0 && (
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">{t('transactions.allAccounts')}</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">
            {t('transactions.noMatch')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((tx) => {
              const category = categoryById.get(tx.categoryId);
              const account = tx.accountId ? accountById.get(tx.accountId) : undefined;
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
                    <p className="text-xs text-slate-400">
                      {tx.date}
                      {account && (
                        <>
                          {' · '}
                          <span style={{ color: account.color }}>{account.name}</span>
                        </>
                      )}
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
                    {formatCurrency(convert(tx.amount, tx.date), currency)}
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

      {formOpen && (
        <TransactionForm
          categories={data.categories}
          initial={editing}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
