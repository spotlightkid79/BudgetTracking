import type { Transaction } from '../../types';
import type { ParsedRow } from './shared';

/** Flags a draft row as a likely duplicate if an existing transaction matches on date + amount + account. */
export function isLikelyDuplicate(
  row: ParsedRow,
  accountId: string,
  existing: Transaction[]
): boolean {
  return existing.some(
    (t) =>
      t.date === row.date &&
      Math.abs(t.amount - row.amount) < 0.005 &&
      t.type === row.type &&
      t.accountId === accountId
  );
}
