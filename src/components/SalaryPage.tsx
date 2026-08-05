import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, PlusCircle, Settings2 } from 'lucide-react';
import type { BudgetData, Transaction } from '../types';
import { DEFAULT_PAYROLL_PARAMS, calcYearlyPayroll, type PayrollParams } from '../lib/turkeyPayroll';
import { formatCurrency } from '../lib/format';
import { StatCard } from './ui/StatCard';

interface SalaryPageProps {
  data: BudgetData;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// teal / rose — validated for CVD & contrast in both light and dark surfaces
const NET_COLOR = '#0d9488';
const DEDUCTIONS_COLOR = '#e11d48';

/** Rate stored as a fraction (0.14) displayed as a percentage (14), free of float noise. */
function toPercentDisplay(rate: number): number {
  return Math.round(rate * 100 * 1e6) / 1e6;
}

export function SalaryPage({ data, onAddTransaction }: SalaryPageProps) {
  const [grossMonthly, setGrossMonthly] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [categoryId, setCategoryId] = useState(
    data.categories.find((c) => c.id === 'cat-salary')?.id ??
      data.categories.find((c) => c.type === 'income')?.id ??
      ''
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [params, setParams] = useState<PayrollParams>(DEFAULT_PAYROLL_PARAMS);
  const [addedMessage, setAddedMessage] = useState('');

  const incomeCategories = data.categories.filter((c) => c.type === 'income');

  const results = useMemo(() => {
    const gross = parseFloat(grossMonthly);
    if (!gross || gross <= 0) return null;
    return calcYearlyPayroll({ ...params, grossMonthly: gross });
  }, [grossMonthly, params]);

  const chartData = useMemo(() => {
    if (!results) return [];
    return results.map((r) => ({
      month: MONTH_NAMES[r.month - 1].slice(0, 3),
      Net: Math.round(r.net),
      Deductions: Math.round(r.totalDeductions),
    }));
  }, [results]);

  function updateParam<K extends keyof PayrollParams>(key: K, value: PayrollParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function updateBracket(index: number, field: 'upTo' | 'rate', rawValue: string) {
    setParams((p) => {
      const brackets = p.brackets.map((b, i) => {
        if (i !== index) return b;
        if (field === 'upTo') {
          return { ...b, upTo: rawValue === '' ? null : parseFloat(rawValue) };
        }
        return { ...b, rate: parseFloat(rawValue) / 100 };
      });
      return { ...p, brackets };
    });
  }

  function handleAddToTransactions() {
    if (!results || !categoryId) return;
    const existingKeys = new Set(
      data.transactions.map((t) => `${t.date}|${t.categoryId}|${t.note}`)
    );
    let added = 0;
    for (const r of results) {
      const date = `${year}-${String(r.month).padStart(2, '0')}-01`;
      const note = 'Net salary (gross-to-net estimate)';
      const key = `${date}|${categoryId}|${note}`;
      if (existingKeys.has(key)) continue;
      onAddTransaction({
        type: 'income',
        amount: Math.round(r.net * 100) / 100,
        categoryId,
        date,
        note,
      });
      added++;
    }
    setAddedMessage(
      added > 0
        ? `Added ${added} month${added === 1 ? '' : 's'} of net salary to Transactions for ${year}.`
        : `All ${year} salary transactions were already added.`
    );
  }

  const firstMonthNet = results?.[0]?.net ?? 0;
  const lastMonthNet = results?.[11]?.net ?? 0;
  const annualNet = results?.reduce((sum, r) => sum + r.net, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Salary Estimator
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Turkish gross-to-net payroll estimate. Income tax uses the cumulative annual method, so
          net pay typically drifts lower later in the year as earnings cross tax brackets.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Gross monthly salary (TL)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={grossMonthly}
              onChange={(e) => setGrossMonthly(e.target.value)}
              placeholder="e.g. 60000"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Income category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          <Settings2 size={15} />
          Advanced payroll parameters (2026 defaults)
          <ChevronDown size={15} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These reflect published 2026 figures. Edit them if official rates change or your
              situation differs (e.g. a different SGK ceiling).
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Gross minimum wage (TL/mo)
                </label>
                <input
                  type="number"
                  value={params.minWageGross}
                  onChange={(e) => updateParam('minWageGross', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  SGK premium ceiling (TL/mo)
                </label>
                <input
                  type="number"
                  value={params.sgkCeiling}
                  onChange={(e) => updateParam('sgkCeiling', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Stamp duty rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={toPercentDisplay(params.stampDutyRate)}
                  onChange={(e) => updateParam('stampDutyRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  SGK employee rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={toPercentDisplay(params.sgkRate)}
                  onChange={(e) => updateParam('sgkRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Unemployment employee rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={toPercentDisplay(params.unemploymentRate)}
                  onChange={(e) => updateParam('unemploymentRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Cumulative annual income tax brackets
              </p>
              <div className="space-y-1.5">
                {params.brackets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-slate-400">Bracket {i + 1}</span>
                    <span className="text-xs text-slate-400">up to</span>
                    <input
                      type="number"
                      disabled={b.upTo === null}
                      value={b.upTo ?? ''}
                      placeholder="∞"
                      onChange={(e) => updateBracket(i, 'upTo', e.target.value)}
                      className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400">TL @</span>
                    <input
                      type="number"
                      step="0.1"
                      value={toPercentDisplay(b.rate)}
                      onChange={(e) => updateBracket(i, 'rate', e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {results && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="January net pay" value={formatCurrency(firstMonthNet)} icon={<span className="text-sm font-bold">1</span>} />
            <StatCard label="December net pay" value={formatCurrency(lastMonthNet)} icon={<span className="text-sm font-bold">12</span>} tone={lastMonthNet < firstMonthNet ? 'negative' : 'default'} />
            <StatCard label={`Total net for ${year}`} value={formatCurrency(annualNet)} icon={<span className="text-sm font-bold">∑</span>} tone="positive" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Net vs. deductions by month
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" width={70} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Net" stackId="pay" fill={NET_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Deductions" stackId="pay" fill={DEDUCTIONS_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">SGK + Unemployment</th>
                  <th className="px-4 py-3 text-right">Income tax</th>
                  <th className="px-4 py-3 text-right">Stamp duty</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {results.map((r) => (
                  <tr key={r.month}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                      {MONTH_NAMES[r.month - 1]} {year}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.gross)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                      -{formatCurrency(r.sgkDeduction)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                      -{formatCurrency(r.incomeTax)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                      -{formatCurrency(r.stampDuty)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-teal-700 dark:text-teal-400">
                      {formatCurrency(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAddToTransactions}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <PlusCircle size={16} />
              Add {year} net salary to Transactions
            </button>
            {addedMessage && (
              <span className="text-sm text-slate-500 dark:text-slate-400">{addedMessage}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
