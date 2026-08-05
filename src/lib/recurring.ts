import { addMonths, addWeeks, addYears, isAfter, isEqual, startOfDay } from 'date-fns';
import type { RecurringTransaction, Transaction } from '../types';

function nextDate(date: Date, frequency: RecurringTransaction['frequency']): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
  }
}

/**
 * Generates any transactions that are due for a recurring rule between its
 * last applied date (or start date) and today, returning the new
 * transactions plus the updated lastAppliedDate to persist.
 */
export function applyDueRecurring(
  rule: RecurringTransaction,
  today: Date = new Date()
): { transactions: Transaction[]; lastAppliedDate: string | null } {
  const todayStart = startOfDay(today);
  let cursor = startOfDay(new Date(rule.lastAppliedDate ?? rule.startDate));

  if (!rule.lastAppliedDate && !isAfter(cursor, todayStart)) {
    // First occurrence (start date itself) hasn't been generated yet.
  } else if (rule.lastAppliedDate) {
    cursor = nextDate(cursor, rule.frequency);
  }

  const generated: Transaction[] = [];
  let lastApplied = rule.lastAppliedDate;

  while (isAfter(todayStart, cursor) || isEqual(todayStart, cursor)) {
    generated.push({
      id: `${rule.id}-${cursor.getTime()}`,
      type: rule.type,
      amount: rule.amount,
      categoryId: rule.categoryId,
      date: cursor.toISOString().slice(0, 10),
      note: rule.note,
    });
    lastApplied = cursor.toISOString().slice(0, 10);
    cursor = nextDate(cursor, rule.frequency);
  }

  return { transactions: generated, lastAppliedDate: lastApplied };
}
