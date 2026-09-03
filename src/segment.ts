import type { InlineStyleKind, Mark, Run } from "./types.ts";

/** Flatten overlapping marks + inline styles into non-overlapping runs. */
export function segment(
  text: string,
  marks: Mark[],
  styles: [number, number, InlineStyleKind][],
): Run[] {
  const bounds = new Set<number>([0, text.length]);
  for (const m of marks) {
    bounds.add(m.start);
    bounds.add(m.end);
  }
  for (const [s, e] of styles) {
    bounds.add(s);
    bounds.add(e);
  }
  const cuts = [...bounds].filter((b) => b >= 0 && b <= text.length).sort((a, b) => a - b);

  const runs: Run[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    if (a === b) continue;
    let fill: Run["fill"] = null;
    let underline: Run["underline"] = null;
    let letter: string | undefined;
    for (const m of marks) {
      if (m.start <= a && b <= m.end) {
        if (m.style === "fill") fill = m.color;
        else underline = m.color;
        if (m.letter && m.start === a) letter = m.letter;
      }
    }
    const italic = styles.some(([s, e, k]) => s <= a && b <= e && k === "italic");
    const smallcaps = styles.some(([s, e, k]) => s <= a && b <= e && k === "small-caps");
    runs.push({ text: text.slice(a, b), fill, underline, italic, smallcaps, letter });
  }

  // coalesce adjacent identical-format runs (letter breaks a merge)
  const merged: Run[] = [];
  for (const r of runs) {
    const prev = merged.at(-1);
    if (
      prev &&
      !r.letter &&
      prev.fill === r.fill &&
      prev.underline === r.underline &&
      prev.italic === r.italic &&
      prev.smallcaps === r.smallcaps
    ) {
      prev.text += r.text;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}
