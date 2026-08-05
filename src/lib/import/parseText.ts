import { parseDelimitedText } from './parseDelimited';
import { parseFreeformLines } from './parseFreeformLines';
import type { ParsedRow } from './shared';

export interface TextParseResult {
  rows: ParsedRow[];
  unparsedLines: string[];
  mode: 'delimited' | 'freeform';
}

/**
 * Entry point for both CSV/.txt file contents and pasted text: tries the
 * delimited (tabular) parser first, and falls back to the line-heuristic
 * freeform parser if no confident date+amount columns are found — so the
 * user never has to pick a sub-mode themselves.
 */
export function parseStatementText(text: string): TextParseResult {
  const delimited = parseDelimitedText(text);
  if (delimited && delimited.rows.length > 0) {
    return { ...delimited, mode: 'delimited' };
  }
  return { ...parseFreeformLines(text), mode: 'freeform' };
}
