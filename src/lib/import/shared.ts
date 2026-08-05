import type { TransactionType } from '../../types';

export interface ParsedRow {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // positive magnitude; sign is carried by `type`
  type: TransactionType;
}

const DATE_PATTERNS: { regex: RegExp; toIso: (m: RegExpMatchArray) => string }[] = [
  // yyyy-mm-dd
  { regex: /\b(\d{4})-(\d{2})-(\d{2})\b/, toIso: (m) => `${m[1]}-${m[2]}-${m[3]}` },
  // dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy
  {
    regex: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/,
    toIso: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
  },
  // dd.mm.yy
  {
    regex: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2})\b/,
    toIso: (m) => `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
  },
];

/** Finds the first recognizable date anywhere in `text`, returning its ISO form and matched span. */
export function findDate(text: string): { iso: string; match: string } | null {
  for (const { regex, toIso } of DATE_PATTERNS) {
    const m = text.match(regex);
    if (m) return { iso: toIso(m), match: m[0] };
  }
  return null;
}

const AMOUNT_REGEX = /[+-]?\s*(?:₺|TL|TRY)?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*(?:₺|TL|TRY)?/gi;

/** Finds the last amount-like token in `text` (bank statement lines put the amount at the end). */
export function findAmount(text: string): { value: number; sign: 1 | -1 | 0; match: string } | null {
  const matches = [...text.matchAll(AMOUNT_REGEX)].filter((m) => /\d/.test(m[0]));
  if (matches.length === 0) return null;

  // Prefer a match that actually looks like a currency amount (a currency
  // marker, or a two-digit cents suffix) over a bare trailing digit — lines
  // containing more than one date-like number (e.g. a statement-period
  // header) can otherwise leave a stray digit fragment as the "last" match.
  const looksLikeAmount = (m: string) => /₺|TL|TRY/i.test(m) || /[.,]\d{2}\s*$/.test(m.trim());
  const qualified = matches.filter((m) => looksLikeAmount(m[0]));
  const chosen = (qualified.length > 0 ? qualified : matches).at(-1)!;

  const raw = chosen[0];
  const normalized = normalizeAmount(raw);
  if (normalized === null) return null;
  const sign = raw.trim().startsWith('-') ? -1 : raw.trim().startsWith('+') ? 1 : 0;
  return { value: Math.abs(normalized), sign, match: raw };
}

/** Parses a currency string in either Turkish (1.234,56) or US (1,234.56) convention. */
export function normalizeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₺TLtry\s+]/gi, '').replace(/^-/, '');
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;

  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator appears last is the decimal separator.
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // 1-2 trailing digits after a lone comma reads as a decimal (245,5 / 245,50);
    // exactly 3 reads as a thousands group (1,234) since real amounts don't have 3 decimal places.
    const digitsAfter = cleaned.length - lastComma - 1;
    normalized = digitsAfter <= 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastDot > -1) {
    const digitsAfter = cleaned.length - lastDot - 1;
    normalized = digitsAfter <= 2 ? cleaned : cleaned.replace(/\./g, '');
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const INCOME_KEYWORDS = ['ödeme', 'odeme', 'iade', 'payment', 'refund', 'credit', 'yatan'];

/** Best-effort income/expense guess when a source has no explicit +/- sign. */
export function inferType(description: string, sign: 1 | -1 | 0): TransactionType {
  if (sign === -1) return 'expense';
  if (sign === 1) return 'income';
  const lower = description.toLowerCase();
  return INCOME_KEYWORDS.some((kw) => lower.includes(kw)) ? 'income' : 'expense';
}
