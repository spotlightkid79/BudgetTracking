import { useState } from 'react';
import type { Account } from '../types';
import { Modal } from './ui/Modal';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface AccountFormProps {
  onSubmit: (account: Omit<Account, 'id'>) => void;
  onClose: () => void;
  /** Pre-fills the color picker with a distinct hue so successive cards aren't all the same color by default. */
  defaultColor?: string;
}

export const ACCOUNT_COLORS = [
  '#6366f1', // indigo
  '#e11d48', // rose
  '#f59e0b', // amber
  '#0d9488', // teal
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#22c55e', // emerald
  '#f97316', // orange
];

export function AccountForm({ onSubmit, onClose, defaultColor }: AccountFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [color, setColor] = useState(defaultColor ?? ACCOUNT_COLORS[0]);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('accountForm.errorName'));
      return;
    }
    onSubmit({ name: trimmed, color });
    onClose();
  }

  return (
    <Modal title={t('accountForm.title')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('accountForm.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('accountForm.namePlaceholder')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('accountForm.color')}
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {t('accountForm.submit')}
        </button>
      </form>
    </Modal>
  );
}
