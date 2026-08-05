import type { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-salary', name: 'Salary', color: '#10b981', type: 'income' },
  { id: 'cat-freelance', name: 'Freelance', color: '#22c55e', type: 'income' },
  { id: 'cat-other-income', name: 'Other Income', color: '#84cc16', type: 'income' },

  { id: 'cat-housing', name: 'Housing', color: '#6366f1', type: 'expense' },
  { id: 'cat-groceries', name: 'Groceries', color: '#f59e0b', type: 'expense' },
  { id: 'cat-transport', name: 'Transport', color: '#0ea5e9', type: 'expense' },
  { id: 'cat-dining', name: 'Dining Out', color: '#ef4444', type: 'expense' },
  { id: 'cat-utilities', name: 'Utilities', color: '#a855f7', type: 'expense' },
  { id: 'cat-entertainment', name: 'Entertainment', color: '#ec4899', type: 'expense' },
  { id: 'cat-health', name: 'Health', color: '#14b8a6', type: 'expense' },
  { id: 'cat-shopping', name: 'Shopping', color: '#f97316', type: 'expense' },
  { id: 'cat-other-expense', name: 'Other', color: '#64748b', type: 'expense' },
];
