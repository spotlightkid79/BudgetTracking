import { findAmount, findDate, inferType, type ParsedRow } from './shared';

const DATE_HEADER_KEYWORDS = ['tarih', 'date'];
const AMOUNT_HEADER_KEYWORDS = ['tutar', 'amount', 'miktar', 'debit', 'credit'];
const DESC_HEADER_KEYWORDS = ['açıklama', 'aciklama', 'description', 'detay', 'merchant'];

/** Splits raw CSV/TSV/paste text into a grid of cells, auto-detecting , ; or tab as the delimiter. */
export function splitDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const candidates = [';', ',', '\t'];
  let bestDelimiter = candidates[0];
  let bestScore = -1;
  for (const delimiter of candidates) {
    const counts = lines.map((l) => splitLine(l, delimiter).length);
    const modeCount = mostCommon(counts);
    const consistency = counts.filter((c) => c === modeCount).length;
    if (modeCount > 1 && consistency > bestScore) {
      bestScore = consistency;
      bestDelimiter = delimiter;
    }
  }
  if (bestScore < 0) return [];

  return lines.map((l) => splitLine(l, bestDelimiter));
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function mostCommon(nums: number[]): number {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = nums[0];
  let bestCount = 0;
  for (const [n, count] of counts) {
    if (count > bestCount) {
      best = n;
      bestCount = count;
    }
  }
  return best;
}

interface ColumnMapping {
  dateCol: number;
  amountCol: number;
  descCols: number[];
  startRow: number;
}

function detectColumns(grid: string[][]): ColumnMapping | null {
  if (grid.length === 0) return null;
  const colCount = Math.max(...grid.map((r) => r.length));

  // Try header-keyword matching on row 0 first — more reliable than statistics when available.
  const header = grid[0].map((c) => c.toLowerCase().trim());
  const headerDateCol = header.findIndex((c) => DATE_HEADER_KEYWORDS.some((kw) => c.includes(kw)));
  const headerAmountCol = header.findIndex((c) => AMOUNT_HEADER_KEYWORDS.some((kw) => c.includes(kw)));
  if (headerDateCol > -1 && headerAmountCol > -1) {
    const headerDescCol = header.findIndex((c) => DESC_HEADER_KEYWORDS.some((kw) => c.includes(kw)));
    const descCols =
      headerDescCol > -1
        ? [headerDescCol]
        : Array.from({ length: colCount }, (_, i) => i).filter(
            (i) => i !== headerDateCol && i !== headerAmountCol
          );
    return { dateCol: headerDateCol, amountCol: headerAmountCol, descCols, startRow: 1 };
  }

  // Fall back to statistical detection across all rows (no header assumed).
  const dateScores: number[] = [];
  const amountScores: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let dateHits = 0;
    let amountHits = 0;
    let nonEmpty = 0;
    for (const row of grid) {
      const cell = (row[c] ?? '').trim();
      if (!cell) continue;
      nonEmpty++;
      const date = findDate(cell);
      if (date && date.match.length >= cell.length * 0.7) dateHits++;
      const amount = findAmount(cell);
      if (amount && amount.match.length >= cell.length * 0.5) amountHits++;
    }
    dateScores.push(nonEmpty > 0 ? dateHits / nonEmpty : 0);
    amountScores.push(nonEmpty > 0 ? amountHits / nonEmpty : 0);
  }

  const dateCol = argmax(dateScores);
  if (dateCol === -1 || dateScores[dateCol] < 0.5) return null;
  const amountScoresExcludingDate = amountScores.map((s, i) => (i === dateCol ? -1 : s));
  const amountCol = argmax(amountScoresExcludingDate);
  if (amountCol === -1 || amountScoresExcludingDate[amountCol] < 0.3) return null;

  const descCols = Array.from({ length: colCount }, (_, i) => i).filter(
    (i) => i !== dateCol && i !== amountCol
  );
  return { dateCol, amountCol, descCols, startRow: 0 };
}

function argmax(arr: number[]): number {
  let best = -1;
  let bestVal = -Infinity;
  arr.forEach((v, i) => {
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

export interface DelimitedParseResult {
  rows: ParsedRow[];
  unparsedLines: string[];
}

/** Converts an already-split cell grid (from CSV/paste or an Excel sheet) into draft rows. */
export function rowsFromGrid(grid: string[][]): DelimitedParseResult | null {
  const mapping = detectColumns(grid);
  if (!mapping) return null;

  const rows: ParsedRow[] = [];
  const unparsedLines: string[] = [];

  for (let i = mapping.startRow; i < grid.length; i++) {
    const row = grid[i];
    const dateCell = (row[mapping.dateCol] ?? '').trim();
    const amountCell = (row[mapping.amountCol] ?? '').trim();
    const description = mapping.descCols
      .map((c) => (row[c] ?? '').trim())
      .filter(Boolean)
      .join(' ');

    const date = findDate(dateCell);
    const amount = findAmount(amountCell);

    if (!date || !amount || amount.value === 0) {
      unparsedLines.push(row.join(' | '));
      continue;
    }

    rows.push({
      date: date.iso,
      description: description || dateCell,
      amount: amount.value,
      type: inferType(description, amount.sign),
    });
  }

  return { rows, unparsedLines };
}

/** Parses raw CSV/TSV/paste text. Returns null if no confident date+amount columns are found. */
export function parseDelimitedText(text: string): DelimitedParseResult | null {
  const grid = splitDelimitedText(text);
  if (grid.length === 0) return null;
  return rowsFromGrid(grid);
}
