import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  LayoutDashboard,
  ListOrdered,
  Moon,
  PiggyBank,
  Repeat,
  Save,
  Sun,
  Wallet,
} from 'lucide-react';
import { useBudgetData } from './hooks/useBudgetData';
import { Dashboard } from './components/Dashboard';
import { CalendarPage } from './components/CalendarPage';
import { TransactionsPage } from './components/TransactionsPage';
import { BudgetsPage } from './components/BudgetsPage';
import { RecurringPage } from './components/RecurringPage';
import { SalaryPage } from './components/SalaryPage';
import { currentMonthKey } from './lib/format';
import { exportBudgetAsMarkdown } from './lib/exportMarkdown';
import { exportBudgetAsJson, parseBudgetJson } from './lib/backup';
import type { BudgetData } from './types';

type Tab = 'dashboard' | 'calendar' | 'transactions' | 'budgets' | 'recurring' | 'salary';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'transactions', label: 'Transactions', icon: ListOrdered },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'salary', label: 'Salary', icon: Banknote },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('budget-tracker-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('budget-tracker-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, setDark };
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('budget-tracker-sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('budget-tracker-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  return { collapsed, setCollapsed };
}

function useSaveToMarkdown(data: BudgetData) {
  const [justSaved, setJustSaved] = useState(false);

  function save() {
    exportBudgetAsMarkdown(data);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  return { save, justSaved };
}

function useBackup(data: BudgetData, replaceAll: (next: BudgetData) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [justOpened, setJustOpened] = useState(false);

  function saveBackup() {
    exportBudgetAsJson(data);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function openBackup() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBudgetJson(String(reader.result));
        const confirmed = window.confirm(
          `This will replace everything currently in Budgetly with the contents of "${file.name}". This cannot be undone. Continue?`
        );
        if (!confirmed) return;
        replaceAll(parsed);
        setJustOpened(true);
        setTimeout(() => setJustOpened(false), 2000);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not read that file.');
      }
    };
    reader.onerror = () => window.alert('Could not read that file.');
    reader.readAsText(file);
  }

  return { fileInputRef, saveBackup, openBackup, handleFileChange, justSaved, justOpened };
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const { dark, setDark } = useDarkMode();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const {
    data,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setBudget,
    removeBudget,
    addRecurring,
    deleteRecurring,
    replaceAll,
  } = useBudgetData();
  const { save, justSaved } = useSaveToMarkdown(data);
  const {
    fileInputRef,
    saveBackup,
    openBackup,
    handleFileChange,
    justSaved: justSavedBackup,
    justOpened: justOpenedBackup,
  } = useBackup(data, replaceAll);

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="mx-auto flex min-h-svh w-full max-w-6xl">
        <aside
          className={`sticky top-0 hidden h-svh shrink-0 flex-col border-r border-slate-200 py-4 transition-[width] duration-200 dark:border-slate-800 md:flex ${
            collapsed ? 'w-16 px-2' : 'w-56 px-4'
          }`}
        >
          <div
            className={`mb-8 flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between px-2'}`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Wallet size={18} />
              </span>
              {!collapsed && <span className="text-lg font-semibold">Budgetly</span>}
            </div>
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition ${
                  collapsed ? 'justify-center px-2' : 'px-3'
                } ${
                  tab === id
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && label}
              </button>
            ))}
          </nav>
          <button
            onClick={saveBackup}
            title={collapsed ? 'Save backup (.json)' : undefined}
            className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center px-2' : 'px-3'
            }`}
          >
            {justSavedBackup ? (
              <Check size={17} className="shrink-0 text-emerald-500" />
            ) : (
              <Save size={17} className="shrink-0" />
            )}
            {!collapsed && (justSavedBackup ? 'Saved' : 'Save backup')}
          </button>
          <button
            onClick={openBackup}
            title={collapsed ? 'Open backup (.json)' : undefined}
            className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center px-2' : 'px-3'
            }`}
          >
            {justOpenedBackup ? (
              <Check size={17} className="shrink-0 text-emerald-500" />
            ) : (
              <FolderOpen size={17} className="shrink-0" />
            )}
            {!collapsed && (justOpenedBackup ? 'Opened' : 'Open backup')}
          </button>
          <button
            onClick={save}
            title={collapsed ? 'Save as Markdown' : undefined}
            className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center px-2' : 'px-3'
            }`}
          >
            {justSaved ? (
              <Check size={17} className="shrink-0 text-emerald-500" />
            ) : (
              <Download size={17} className="shrink-0" />
            )}
            {!collapsed && (justSaved ? 'Saved' : 'Save as Markdown')}
          </button>
          <button
            onClick={() => setDark((d) => !d)}
            title={collapsed ? (dark ? 'Light mode' : 'Dark mode') : undefined}
            className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center px-2' : 'px-3'
            }`}
          >
            {dark ? <Sun size={17} className="shrink-0" /> : <Moon size={17} className="shrink-0" />}
            {!collapsed && (dark ? 'Light mode' : 'Dark mode')}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800 md:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Wallet size={15} />
              </span>
              <span className="font-semibold">Budgetly</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={saveBackup}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Save backup"
              >
                {justSavedBackup ? <Check size={18} className="text-emerald-500" /> : <Save size={18} />}
              </button>
              <button
                onClick={openBackup}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Open backup"
              >
                {justOpenedBackup ? <Check size={18} className="text-emerald-500" /> : <FolderOpen size={18} />}
              </button>
              <button
                onClick={save}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Save as Markdown"
              >
                {justSaved ? <Check size={18} className="text-emerald-500" /> : <Download size={18} />}
              </button>
              <button
                onClick={() => setDark((d) => !d)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
            {tab === 'dashboard' && (
              <Dashboard data={data} monthKey={monthKey} onMonthChange={setMonthKey} />
            )}
            {tab === 'calendar' && (
              <CalendarPage
                data={data}
                onAdd={addTransaction}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
              />
            )}
            {tab === 'transactions' && (
              <TransactionsPage
                data={data}
                monthKey={monthKey}
                onMonthChange={setMonthKey}
                onAdd={addTransaction}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
              />
            )}
            {tab === 'budgets' && (
              <BudgetsPage
                data={data}
                monthKey={monthKey}
                onMonthChange={setMonthKey}
                onSetBudget={setBudget}
                onRemoveBudget={removeBudget}
              />
            )}
            {tab === 'recurring' && (
              <RecurringPage data={data} onAdd={addRecurring} onDelete={deleteRecurring} />
            )}
            {tab === 'salary' && <SalaryPage data={data} onAddTransaction={addTransaction} />}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  tab === id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default App;
