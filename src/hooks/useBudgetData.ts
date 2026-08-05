import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  Account,
  Budget,
  BudgetData,
  Category,
  RecurringTransaction,
  Transaction,
} from '../types';
import { DEFAULT_CATEGORIES } from '../lib/defaultData';
import { applyDueRecurring } from '../lib/recurring';

const STORAGE_KEY = 'budget-tracker-data';

function loadInitialData(): BudgetData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BudgetData;
      return {
        categories: parsed.categories ?? DEFAULT_CATEGORIES,
        transactions: parsed.transactions ?? [],
        recurring: parsed.recurring ?? [],
        budgets: parsed.budgets ?? [],
        accounts: parsed.accounts ?? [],
      };
    } catch {
      // fall through to defaults if the stored JSON is corrupt
    }
  }
  return {
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    recurring: [],
    budgets: [],
    accounts: [],
  };
}

export function useBudgetData() {
  const [data, setData] = useState<BudgetData>(loadInitialData);

  // Generate any recurring transactions that have come due since last visit.
  useEffect(() => {
    setData((prev) => {
      if (prev.recurring.length === 0) return prev;

      const newTransactions: Transaction[] = [];
      const updatedRecurring = prev.recurring.map((rule) => {
        const { transactions, lastAppliedDate } = applyDueRecurring(rule);
        if (transactions.length > 0) {
          newTransactions.push(...transactions);
          return { ...rule, lastAppliedDate };
        }
        return rule;
      });

      if (newTransactions.length === 0) return prev;

      return {
        ...prev,
        transactions: [...prev.transactions, ...newTransactions],
        recurring: updatedRecurring,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setData((prev) => ({
      ...prev,
      transactions: [...prev.transactions, { ...tx, id: uuid() }],
    }));
  }, []);

  const addTransactionsBulk = useCallback((txs: Omit<Transaction, 'id'>[]) => {
    setData((prev) => ({
      ...prev,
      transactions: [...prev.transactions, ...txs.map((tx) => ({ ...tx, id: uuid() }))],
    }));
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === tx.id ? tx : t)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    const id = uuid();
    setData((prev) => ({ ...prev, categories: [...prev.categories, { ...cat, id }] }));
    return id;
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      budgets: prev.budgets.filter((b) => b.categoryId !== id),
    }));
  }, []);

  const setBudget = useCallback((categoryId: string, monthlyLimit: number) => {
    setData((prev) => {
      const existing = prev.budgets.find((b) => b.categoryId === categoryId);
      if (existing) {
        return {
          ...prev,
          budgets: prev.budgets.map((b) =>
            b.categoryId === categoryId ? { ...b, monthlyLimit } : b
          ),
        };
      }
      const newBudget: Budget = { id: uuid(), categoryId, monthlyLimit };
      return { ...prev, budgets: [...prev.budgets, newBudget] };
    });
  }, []);

  const removeBudget = useCallback((categoryId: string) => {
    setData((prev) => ({
      ...prev,
      budgets: prev.budgets.filter((b) => b.categoryId !== categoryId),
    }));
  }, []);

  const addRecurring = useCallback((rule: Omit<RecurringTransaction, 'id' | 'lastAppliedDate'>) => {
    setData((prev) => ({
      ...prev,
      recurring: [...prev.recurring, { ...rule, id: uuid(), lastAppliedDate: null }],
    }));
  }, []);

  const deleteRecurring = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== id),
    }));
  }, []);

  const replaceAll = useCallback((next: BudgetData) => {
    setData(next);
  }, []);

  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    const id = uuid();
    setData((prev) => ({ ...prev, accounts: [...prev.accounts, { ...account, id }] }));
    return id;
  }, []);

  return {
    data,
    addTransaction,
    addTransactionsBulk,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    setBudget,
    removeBudget,
    addRecurring,
    deleteRecurring,
    replaceAll,
    addAccount,
  };
}
