import { useState } from 'react';
import type { Category, RecurrenceFrequency, RecurringTransaction, TransactionType } from '../types';
import { Modal } from './ui/Modal';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { categoryDisplayName } from '../lib/categoryName';

interface RecurringFormProps {
  categories: Category[];
  onSubmit: (rule: Omit<RecurringTransaction, 'id' | 'lastAppliedDate'>) => void;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function RecurringForm({ categories, onSubmit, onClose }: RecurringFormProps) {
  const { t } = useLanguage();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.type === 'expense')?.id ?? '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleTypeChange(next: TransactionType) {
    setType(next);
    if (!categories.find((c) => c.id === categoryId && c.type === next)) {
      setCategoryId(categories.find((c) => c.type === next)?.id ?? '');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('recurringForm.errorAmount'));
      return;
    }
    if (!categoryId) {
      setError(t('recurringForm.errorCategory'));
      return;
    }
    onSubmit({ type, amount: parsedAmount, categoryId, frequency, startDate, note: note.trim() });
    onClose();
  }

  return (
    <Modal title={t('recurringForm.title')} onClose={onClose}>
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
            {t('recurringForm.amount')}
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
            {t('recurringForm.category')}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('recurringForm.frequency')}
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="weekly">{t('recurringForm.weeklyOption')}</option>
              <option value="monthly">{t('recurringForm.monthlyOption')}</option>
              <option value="yearly">{t('recurringForm.yearlyOption')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('recurringForm.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('recurringForm.note')}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('recurringForm.notePlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {t('recurringForm.submit')}
        </button>
      </form>
    </Modal>
  );
}
