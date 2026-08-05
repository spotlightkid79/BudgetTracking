import { findAmount, findDate, inferType, type ParsedRow } from './shared';

export interface FreeformParseResult {
  rows: ParsedRow[];
  unparsedLines: string[];
}

/**
 * Line-heuristic parser for ragged/freeform text: pasted bank statement text
 * that isn't cleanly tabular, or text extracted from a PDF. Each line is
 * scanned for a date near the start and an amount near the end; everything
 * between becomes the description. Lines matching neither are preserved as
 * "unparsed" rather than silently dropped, since layouts vary too much to
 * guarantee full capture.
 */
export function parseFreeformLines(text: string): FreeformParseResult {
  const rows: ParsedRow[] = [];
  const unparsedLines: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const date = findDate(line);
    const amount = findAmount(line);

    if (!date || !amount || amount.value === 0) {
      unparsedLines.push(line);
      continue;
    }

    const description = line
      .replace(date.match, '')
      .replace(amount.match, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    rows.push({
      date: date.iso,
      description: description || line,
      amount: amount.value,
      type: inferType(description, amount.sign),
    });
  }

  return { rows, unparsedLines };
}
