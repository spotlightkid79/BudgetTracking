export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // ISO date (yyyy-mm-dd)
  note: string;
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  note: string;
  frequency: RecurrenceFrequency;
  startDate: string; // ISO date
  lastAppliedDate: string | null; // ISO date of last generated transaction
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
}

export interface BudgetData {
  categories: Category[];
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  budgets: Budget[];
}
