import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { Category, TransactionType } from '../../types';
import { categoryDisplayName } from '../../lib/categoryName';
import { useLanguage } from '../../lib/i18n/LanguageContext';

export interface DraftRow {
  localId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  include: boolean;
  duplicate: boolean;
}

interface PreviewTableProps {
  rows: DraftRow[];
  onChange: (rows: DraftRow[]) => void;
  categories: Category[];
  unparsedLines: string[];
}

export function PreviewTable({ rows, onChange, categories, unparsedLines }: PreviewTableProps) {
  const { t } = useLanguage();
  const [showUnparsed, setShowUnparsed] = useState(false);

  function updateRow(localId: string, patch: Partial<DraftRow>) {
    onChange(rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  }

  function removeRow(localId: string) {
    onChange(rows.filter((r) => r.localId !== localId));
  }

  function setAll(include: boolean) {
    onChange(rows.map((r) => ({ ...r, include })));
  }

  const includedCount = rows.filter((r) => r.include).length;
  const duplicateCount = rows.filter((r) => r.duplicate).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAll(true)}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {t('import.selectAll')}
          </button>
          <button
            onClick={() => setAll(false)}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {t('import.selectNone')}
          </button>
        </div>
        <span className="text-slate-500 dark:text-slate-400">
          {t('import.rowCount', { count: rows.length, included: includedCount })}
          {duplicateCount > 0 && ` · ${t('import.duplicateCount', { count: duplicateCount })}`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <th className="w-10 px-3 py-3"></th>
              <th className="px-2 py-3">{t('transactionForm.date')}</th>
              <th className="px-2 py-3">{t('transactionForm.note')}</th>
              <th className="px-2 py-3 text-right">{t('transactionForm.amount')}</th>
              <th className="px-2 py-3">{t('common.expense')}/{t('common.income')}</th>
              <th className="px-2 py-3">{t('transactionForm.category')}</th>
              <th className="w-10 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => {
              const rowCategories = categories.filter((c) => c.type === row.type);
              return (
                <tr key={row.localId} className={row.include ? '' : 'opacity-40'}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={(e) => updateRow(row.localId, { include: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.localId, { date: e.target.value })}
                      className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      {row.duplicate && (
                        <span title={t('import.duplicateFlag')} className="shrink-0 text-amber-500">
                          <AlertTriangle size={14} />
                        </span>
                      )}
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.localId, { description: e.target.value })}
                        className="w-48 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.amount}
                      onChange={(e) => updateRow(row.localId, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.type}
                      onChange={(e) => {
                        const type = e.target.value as TransactionType;
                        const stillValid = categories.find((c) => c.id === row.categoryId && c.type === type);
                        updateRow(row.localId, {
                          type,
                          categoryId: stillValid ? row.categoryId : categories.find((c) => c.type === type)?.id ?? '',
                        });
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="expense">{t('common.expense')}</option>
                      <option value="income">{t('common.income')}</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(row.localId, { categoryId: e.target.value })}
                      className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {rowCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {categoryDisplayName(c, t)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => removeRow(row.localId)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unparsedLines.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setShowUnparsed((s) => !s)}
            className="flex w-full items-center gap-1.5 px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {showUnparsed ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {t('import.unparsedLines', { count: unparsedLines.length })}
          </button>
          {showUnparsed && (
            <ul className="space-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 dark:border-slate-700">
              {unparsedLines.map((line, i) => (
                <li key={i} className="truncate font-mono">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

