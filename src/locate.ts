export interface Located {
  start: number;
  end: number;
  substring: string;
  ok: boolean;
  reason?: string;
}

/**
 * Word offsets (1-indexed; -1 = start/end) -> character range in the verse text.
 * Mirrors the community exporter's slicing.
 */
export function locate(text: string, startOffset: number, endOffset: number): Located {
  const words = text.split(" ");
  const n = words.length;

  // Backwards / zero-width selection (Gospel Library sometimes stores endOffset =
  // startOffset - 1): mark just the word at startOffset.
  if (endOffset > 0 && endOffset < startOffset) {
    endOffset = startOffset;
  }

  let startChar: number;
  if (startOffset === -1 || startOffset === 0 || startOffset === 1) {
    startChar = 0;
  } else if (startOffset > n) {
    return { start: 0, end: text.length, substring: text, ok: false, reason: `startOffset ${startOffset} > ${n} words` };
  } else {
    startChar = words.slice(0, startOffset - 1).join(" ").length + 1;
  }

  let endChar: number;
  if (endOffset === -1 || endOffset >= n) {
    endChar = text.length;
  } else if (endOffset < 1) {
    return { start: 0, end: text.length, substring: text, ok: false, reason: `bad endOffset ${endOffset}` };
  } else {
    endChar = words.slice(0, endOffset).join(" ").length;
  }

  if (endChar <= startChar) {
    return { start: 0, end: text.length, substring: text, ok: false, reason: `empty span (${startChar},${endChar})` };
  }
  return { start: startChar, end: endChar, substring: text.slice(startChar, endChar), ok: true };
}
