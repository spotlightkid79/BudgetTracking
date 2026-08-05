import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { v4 as uuid } from 'uuid';
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
} from 'lucide-react';
import type { Account, BudgetData, Transaction } from '../types';
import { AccountForm, ACCOUNT_COLORS } from './AccountForm';
import { PreviewTable, type DraftRow } from './import/PreviewTable';
import { parseStatementText } from '../lib/import/parseText';
import { parseExcelFile } from '../lib/import/parseExcel';
import { parsePdfFile } from '../lib/import/parsePdf';
import type { ParsedRow } from '../lib/import/shared';
import { suggestCategoryId } from '../lib/importCategoryRules';
import { isLikelyDuplicate } from '../lib/import/duplicates';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface ImportPageProps {
  data: BudgetData;
  onAddAccount: (account: Omit<Account, 'id'>) => string;
  onImportTransactions: (txs: Omit<Transaction, 'id'>[]) => void;
}

type Step = 'account' | 'method' | 'input' | 'preview';
type Method = 'file' | 'pdf' | 'paste';

interface ParseOutcome {
  rows: ParsedRow[];
  unparsedLines: string[];
}

export function ImportPage({ data, onAddAccount, onImportTransactions }: ImportPageProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('account');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [unparsedLines, setUnparsedLines] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const selectedAccount = data.accounts.find((a) => a.id === accountId);

  function selectAccount(id: string) {
    setAccountId(id);
    setStep('method');
  }

  function handleCreateAccount(account: Omit<Account, 'id'>) {
    const id = onAddAccount(account);
    setAccountId(id);
    setStep('method');
  }

  function selectMethod(m: Method) {
    setMethod(m);
    setParseError('');
    setStep('input');
  }

  function buildDraftRows(parsed: ParsedRow[]): DraftRow[] {
    return parsed.map((r) => {
      const suggested = suggestCategoryId(r.description, data.categories);
      const fallbackId = r.type === 'income' ? 'cat-other-income' : 'cat-other-expense';
      const categoryId =
        suggested ??
        data.categories.find((c) => c.id === fallbackId)?.id ??
        data.categories.find((c) => c.type === r.type)?.id ??
        '';
      return {
        localId: uuid(),
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        categoryId,
        include: true,
        duplicate: accountId ? isLikelyDuplicate(r, accountId, data.transactions) : false,
      };
    });
  }

  function handleParsed(result: ParseOutcome | null) {
    if (!result || result.rows.length === 0) {
      setParseError(t('import.noRowsFound'));
      return;
    }
    setRows(buildDraftRows(result.rows));
    setUnparsedLines(result.unparsedLines);
    setStep('preview');
  }

  async function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setParsing(true);
    setParseError('');
    try {
      if (method === 'pdf') {
        handleParsed(await parsePdfFile(file));
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        handleParsed(await parseExcelFile(file));
      } else {
        const text = await file.text();
        handleParsed(parseStatementText(text));
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('import.parseErrorGeneric'));
    } finally {
      setParsing(false);
    }
  }

  function handlePasteParse() {
    setParseError('');
    handleParsed(parseStatementText(pasteText));
  }

  function handleCommit() {
    const included = rows.filter((r) => r.include);
    onImportTransactions(
      included.map((r) => ({
        type: r.type,
        amount: r.amount,
        categoryId: r.categoryId,
        date: r.date,
        note: r.description,
        accountId: accountId ?? undefined,
      }))
    );
    setSuccessCount(included.length);
  }

  function resetForAnother() {
    setStep('method');
    setMethod(null);
    setPasteText('');
    setRows([]);
    setUnparsedLines([]);
    setParseError('');
    setSuccessCount(null);
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t('import.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('import.description')}</p>
      </div>

      {step === 'account' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('import.chooseAccount')}
          </h2>
          {data.accounts.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t('import.noAccountsYet')}</p>
          ) : (
            <div className="mb-4 flex flex-wrap gap-2">
              {data.accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  {account.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setAccountFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus size={16} /> {t('import.newAccount')}
          </button>
        </div>
      )}

      {step === 'method' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setStep('account')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
          >
            <ChevronLeft size={16} /> {selectedAccount?.name}
          </button>
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('import.chooseMethod')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => selectMethod('file')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-5 text-center hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet size={26} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('import.method.file')}
              </span>
              <span className="text-xs text-slate-400">{t('import.method.fileHint')}</span>
            </button>
            <button
              onClick={() => selectMethod('pdf')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-5 text-center hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <FileText size={26} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('import.method.pdf')}
              </span>
              <span className="text-xs text-slate-400">{t('import.method.pdfHint')}</span>
            </button>
            <button
              onClick={() => selectMethod('paste')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-5 text-center hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <ClipboardPaste size={26} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('import.method.paste')}
              </span>
              <span className="text-xs text-slate-400">{t('import.method.pasteHint')}</span>
            </button>
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setStep('method')}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
          >
            <ChevronLeft size={16} /> {t('common.previous')}
          </button>

          {method === 'paste' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('import.pasteLabel')}
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder={t('import.pastePlaceholder')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                onClick={handlePasteParse}
                disabled={!pasteText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('import.parse')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                {method === 'pdf' ? t('import.uploadPdf') : t('import.uploadFile')}
              </label>
              <input
                type="file"
                accept={method === 'pdf' ? 'application/pdf,.pdf' : '.csv,.xlsx,.txt'}
                onChange={handleFileInputChange}
                disabled={parsing}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 dark:text-slate-300"
              />
            </div>
          )}

          {parsing && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={15} className="animate-spin" /> {t('import.parsing')}
            </p>
          )}
          {parseError && <p className="mt-3 text-sm text-rose-500">{parseError}</p>}
        </div>
      )}

      {step === 'preview' &&
        (successCount !== null ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CheckCircle2 size={36} className="text-emerald-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('import.commitSuccess', { count: successCount })}
            </p>
            <button
              onClick={resetForAnother}
              className="mt-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {t('import.startOver')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setStep('input')}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
            >
              <ChevronLeft size={16} /> {t('common.previous')}
            </button>
            <PreviewTable
              rows={rows}
              onChange={setRows}
              categories={data.categories}
              unparsedLines={unparsedLines}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleCommit}
                disabled={includedCount === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('import.commit', { count: includedCount })}
              </button>
            </div>
          </div>
        ))}

      {accountFormOpen && (
        <AccountForm
          onSubmit={handleCreateAccount}
          onClose={() => setAccountFormOpen(false)}
          defaultColor={ACCOUNT_COLORS[data.accounts.length % ACCOUNT_COLORS.length]}
        />
      )}
    </div>
  );
}
