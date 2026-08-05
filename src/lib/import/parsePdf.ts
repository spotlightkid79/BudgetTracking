import { parseFreeformLines, type FreeformParseResult } from './parseFreeformLines';

let workerConfigured = false;

/**
 * pdf.js's getTextContent() internally does `for await (const value of readableStream)`
 * on a ReadableStream. Safari/WebKit's support for ReadableStream async iteration
 * has been inconsistent (missing Symbol.asyncIterator on some versions), which
 * surfaces there as "undefined is not a function (near '...value of readableStream...')".
 * This polyfill is a no-op wherever the native method already exists.
 */
function polyfillReadableStreamAsyncIterator() {
  if (typeof ReadableStream === 'undefined') return;
  const proto = ReadableStream.prototype as ReadableStream & {
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };
  if (proto[Symbol.asyncIterator]) return;

  proto[Symbol.asyncIterator] = function (this: ReadableStream) {
    const reader = this.getReader();
    const iterator = {
      next: () => reader.read(),
      return: (value?: unknown) => {
        reader.releaseLock();
        return Promise.resolve({ done: true as const, value });
      },
    };
    return Object.assign(iterator, {
      [Symbol.asyncIterator]: () => iterator,
    });
  } as typeof proto[typeof Symbol.asyncIterator];
}

async function loadPdfjs() {
  polyfillReadableStreamAsyncIterator();
  const pdfjsLib = await import('pdfjs-dist');
  if (!workerConfigured) {
    // Vite resolves this new URL(..., import.meta.url) pattern at build time
    // into a proper asset URL — no vite.config.ts changes needed.
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
    workerConfigured = true;
  }
  return pdfjsLib;
}

interface PositionedText {
  x: number;
  y: number;
  str: string;
}

function extractPositioned(item: unknown): PositionedText | null {
  if (typeof item !== 'object' || item === null || !('str' in item) || !('transform' in item)) {
    return null;
  }
  const { str, transform } = item as { str: unknown; transform: unknown };
  if (typeof str !== 'string' || !Array.isArray(transform)) return null;
  return { x: Number(transform[4]), y: Number(transform[5]), str };
}

/** Groups positioned text runs into lines by y-coordinate, tolerant of minor jitter between runs on the same visual line. */
function groupIntoLines(items: PositionedText[], tolerance = 3): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedText[][] = [];
  for (const item of sorted) {
    const currentLine = lines[lines.length - 1];
    if (currentLine && Math.abs(currentLine[0].y - item.y) <= tolerance) {
      currentLine.push(item);
    } else {
      lines.push([item]);
    }
  }
  return lines.map((line) =>
    line
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Extracts text from a PDF client-side, reconstructing line breaks from
 * text-run positions (pdf.js gives a flat list of positioned runs, not
 * lines). Bank statement layouts vary a lot, so this is best-effort — the
 * caller should always route the result through an editable preview step.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PositionedText[] = content.items
      .map(extractPositioned)
      .filter((item): item is PositionedText => item !== null);

    pageTexts.push(groupIntoLines(items).filter(Boolean).join('\n'));
  }

  return pageTexts.join('\n');
}

export async function parsePdfFile(file: File): Promise<FreeformParseResult> {
  const text = await extractPdfText(file);
  return parseFreeformLines(text);
}
