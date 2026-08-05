import { format } from 'date-fns';
import { rowsFromGrid, type DelimitedParseResult } from './parseDelimited';

function cellToString(cell: unknown): string {
  if (cell instanceof Date) return format(cell, 'yyyy-MM-dd');
  if (cell === null || cell === undefined) return '';
  return String(cell);
}

/**
 * Parses a real .xlsx file. Dynamically imported so the (small, but
 * non-trivial) parsing library never loads for users who only ever paste
 * text or upload a CSV.
 */
export async function parseExcelFile(file: File): Promise<DelimitedParseResult | null> {
  const { readSheet } = await import('read-excel-file/browser');
  const data = await readSheet(file);
  const grid = data.map((row) => row.map(cellToString));
  return rowsFromGrid(grid);
}
