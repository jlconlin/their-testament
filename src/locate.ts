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
/**
 * `leadingTokens` is how many words the Gospel Library counted *before* the
 * text we were given.
 *
 * Scripture verses arrive as `<span class="verse-number">31 </span>And Jacob
 * said…`, and the offsets are counted over that whole paragraph -- so the
 * verse number is word 1 and every real word sits one further along than in
 * the text we parsed. Pass 1 for numbered verses. General Conference
 * paragraphs carry no such number and pass 0.
 *
 * Measured before being believed: across 400 scripture highlights, shifting by
 * one takes the share ending on punctuation from 11.5% to 56.0%; across 250
 * conference highlights the same shift moves it the wrong way, 63.2% to 13.6%.
 */
export function locate(text: string, startOffset: number, endOffset: number, leadingTokens = 0): Located {
  const words = text.split(" ");
  const n = words.length;

  // Backwards / zero-width selection (Gospel Library sometimes stores endOffset =
  // startOffset - 1): mark just the word at startOffset. Checked on the raw
  // offsets, before the leading-token shift below -- shifting first can carry
  // a pair like (2, 1) down to (1, 0), where endOffset is no longer > 0 and
  // this same check would silently miss it (seen on Genesis 17:17: a highlight
  // of just the first real word, reported instead as "bad endOffset 0").
  if (endOffset > 0 && endOffset < startOffset) {
    endOffset = startOffset;
  }

  if (leadingTokens > 0) {
    if (startOffset > 0) startOffset = Math.max(0, startOffset - leadingTokens);
    if (endOffset > 0) endOffset = Math.max(0, endOffset - leadingTokens);
  }

  // Gospel Library sometimes records a highlight that runs to the end of a
  // verse or talk paragraph with a startOffset exactly one past the last real
  // word -- e.g. a single-word highlight on the final word, or "from here to
  // the end" starting there. Seen identically in scripture and General
  // Conference, with and without a leading verse number, so it isn't the
  // verse-number token counted twice -- it looks like Gospel Library's own
  // client miscounting the boundary when a selection is extended to the
  // literal end of a paragraph. There is only one sensible reading of "one
  // word past the end": the last word itself. (A gap of 2 or more does turn
  // up occasionally and isn't corrected here -- with no way to tell which
  // word was meant, reporting it honestly beats guessing.)
  if (startOffset === n + 1) startOffset = n;

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
