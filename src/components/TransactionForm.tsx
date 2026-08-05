import { useState } from 'react';
import type { Category, Transaction, TransactionType } from '../types';
import { Modal } from './ui/Modal';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { categoryDisplayName } from '../lib/categoryName';

interface TransactionFormProps {
  categories: Category[];
  initial?: Transaction;
  /** Prefills the date field when adding a new transaction (ignored when editing). */
  defaultDate?: string;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionForm({ categories, initial, defaultDate, onSubmit, onClose }: TransactionFormProps) {
  const { t } = useLanguage();
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories.find((c) => c.type === type)?.id ?? ''
  );
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleTypeChange(next: TransactionType) {
    setType(next);
    const stillValid = categories.find((c) => c.id === categoryId && c.type === next);
    if (!stillValid) {
      setCategoryId(categories.find((c) => c.type === next)?.id ?? '');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('transactionForm.errorAmount'));
      return;
    }
    if (!categoryId) {
      setError(t('transactionForm.errorCategory'));
      return;
    }
    onSubmit({ type, amount: parsedAmount, categoryId, date, note: note.trim() });
    onClose();
  }

  return (
    <Modal title={initial ? t('transactionForm.editTitle') : t('transactionForm.addTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as TransactionType[]).map((optionType) => (
            <button
              type="button"
              key={optionType}
              onClick={() => handleTypeChange(optionType)}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                type === optionType
                  ? optionType === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {optionType === 'income' ? t('common.income') : t('common.expense')}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('transactionForm.amount')}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('transactionForm.category')}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryDisplayName(c, t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('transactionForm.date')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('transactionForm.note')}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('transactionForm.notePlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {initial ? t('transactionForm.saveChanges') : t('transactionForm.addSubmit')}
        </button>
      </form>
    </Modal>
  );
}
