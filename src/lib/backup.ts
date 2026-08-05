import type { Account, Budget, BudgetData, Category, RecurringTransaction, Transaction } from '../types';
import { downloadTextFile } from './download';

const BACKUP_VERSION = 1;

interface BackupFile {
  app: 'budgetly';
  version: number;
  exportedAt: string;
  data: BudgetData;
}

export function exportBudgetAsJson(data: BudgetData): void {
  const today = new Date().toISOString().slice(0, 10);
  const backup: BackupFile = {
    app: 'budgetly',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  downloadTextFile(`budgetly-backup-${today}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCategory(v: unknown): v is Category {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    isString(c.id) &&
    isString(c.name) &&
    isString(c.color) &&
    (c.type === 'income' || c.type === 'expense')
  );
}

function isTransaction(v: unknown): v is Transaction {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    isString(t.id) &&
    (t.type === 'income' || t.type === 'expense') &&
    isNumber(t.amount) &&
    isString(t.categoryId) &&
    isString(t.date) &&
    isString(t.note) &&
    (t.accountId === undefined || isString(t.accountId))
  );
}

function isAccount(v: unknown): v is Account {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return isString(a.id) && isString(a.name) && isString(a.color);
}

function isBudget(v: unknown): v is Budget {
  if (typeof v !== 'object' || v === null) return false;
  const b = v as Record<string, unknown>;
  return isString(b.id) && isString(b.categoryId) && isNumber(b.monthlyLimit);
}

function isRecurring(v: unknown): v is RecurringTransaction {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    isString(r.id) &&
    (r.type === 'income' || r.type === 'expense') &&
    isNumber(r.amount) &&
    isString(r.categoryId) &&
    isString(r.note) &&
    (r.frequency === 'weekly' || r.frequency === 'monthly' || r.frequency === 'yearly') &&
    isString(r.startDate) &&
    (r.lastAppliedDate === null || isString(r.lastAppliedDate))
  );
}

/** Parses and validates a previously exported Budgetly JSON backup. Throws with a readable message on invalid input. */
export function parseBudgetJson(raw: string): BudgetData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('That file does not look like a Budgetly backup.');
  }

  const obj = parsed as Record<string, unknown>;
  const candidate = obj.app === 'budgetly' && typeof obj.data === 'object' ? obj.data : obj;

  if (typeof candidate !== 'object' || candidate === null) {
    throw new Error('That file does not look like a Budgetly backup.');
  }

  const c = candidate as Record<string, unknown>;
  const categories = c.categories;
  const transactions = c.transactions;
  const budgets = c.budgets;
  const recurring = c.recurring;
  const accounts = c.accounts;

  if (
    !Array.isArray(categories) ||
    !Array.isArray(transactions) ||
    !Array.isArray(budgets) ||
    !Array.isArray(recurring)
  ) {
    throw new Error('That file does not look like a Budgetly backup.');
  }

  if (!categories.every(isCategory)) {
    throw new Error('That file has invalid category data.');
  }
  if (!transactions.every(isTransaction)) {
    throw new Error('That file has invalid transaction data.');
  }
  if (!budgets.every(isBudget)) {
    throw new Error('That file has invalid budget data.');
  }
  if (!recurring.every(isRecurring)) {
    throw new Error('That file has invalid recurring transaction data.');
  }

  // Accounts were added after the original backup format, so older backups
  // simply won't have this field — default to empty rather than rejecting them.
  const validAccounts = Array.isArray(accounts) && accounts.every(isAccount) ? accounts : [];

  return { categories, transactions, budgets, recurring, accounts: validAccounts };
}
