import { parse, type HTMLElement } from "node-html-parser";
import type { ContentPage, InlineStyleKind, Verse } from "./types.ts";

/**
 * Parse a study-content `body` fragment into scripture verses.
 *
 * `text` is the reading text with the verse number and footnote-marker letters
 * removed and whitespace collapsed — the exact string the Gospel Library word
 * offsets index into (matches how the community exporter counts: strip <sup>
 * and .verse-number, take text, split on spaces).
 */
export function parseVerses(page: ContentPage): Verse[] {
  const root = parse(page.content.body, { blockTextElements: {} });
  const verses: Verse[] = [];

  for (const p of root.querySelectorAll("p.verse")) {
    const ref = p.getAttribute("data-eng-ref") ?? "";
    const vid = p.getAttribute("id") ?? "";
    const aid = p.getAttribute("data-aid") ?? "";
    const { text, styles } = extract(p);
    const num = Number(ref.split(":")[1] ?? verses.length + 1);
    verses.push({ ref, vid, aid, num, text, styles });
  }
  return verses;
}

interface Extracted {
  text: string;
  styles: [number, number, InlineStyleKind][];
}

/** Reading text + inline style spans for a paragraph-ish element (verse or talk paragraph). */
export function extractText(p: HTMLElement): Extracted {
  return extract(p);
}

function extract(p: HTMLElement): Extracted {
  let raw = "";
  const styles: [number, number, InlineStyleKind][] = [];

  const walk = (node: HTMLElement | { nodeType: number; rawText?: string; text?: string }): void => {
    // text node
    if ((node as { nodeType: number }).nodeType === 3) {
      raw += (node as { text: string }).text ?? "";
      return;
    }
    const el = node as HTMLElement;
    if (!el.tagName) {
      raw += el.text ?? "";
      return;
    }
    const tag = el.tagName.toLowerCase();
    const cls = new Set((el.getAttribute("class") ?? "").split(/\s+/));

    if (
      tag === "sup" ||
      cls.has("verse-number") ||
      cls.has("page-break") ||
      cls.has("para-mark")
    ) {
      return;
    }

    let kind: InlineStyleKind | null = null;
    if (cls.has("clarity-word")) kind = "italic";
    else if (cls.has("small-caps") || cls.has("deity-name")) kind = "small-caps";

    const start = raw.length;
    for (const child of el.childNodes) walk(child as unknown as HTMLElement);
    if (kind && raw.length > start) {
      const span: [number, number, InlineStyleKind] = [start, raw.length, kind];
      if (!styles.some((s) => s[0] === span[0] && s[1] === span[1] && s[2] === span[2])) {
        styles.push(span);
      }
    }
  };

  for (const child of p.childNodes) walk(child as unknown as HTMLElement);

  // collapse whitespace, remapping style offsets
  const map: number[] = [];
  let collapsed = "";
  let prevSpace = false;
  for (let i = 0; i < raw.length; i++) {
    map[i] = collapsed.length;
    const ch = raw[i]!;
    if (/\s/.test(ch)) {
      if (prevSpace) continue;
      collapsed += " ";
      prevSpace = true;
    } else {
      collapsed += ch;
      prevSpace = false;
    }
  }
  map[raw.length] = collapsed.length;

  const lead = collapsed.length - collapsed.trimStart().length;
  const text = collapsed.trim();
  const remapped = styles
    .map(([s, e, k]) => {
      const cs = Math.max(0, (map[s] ?? 0) - lead);
      const ce = Math.max(cs, (map[e] ?? collapsed.length) - lead);
      return [cs, Math.min(ce, text.length), k] as [number, number, InlineStyleKind];
    })
    .filter(([s, e]) => e > s && s < text.length);

  return { text, styles: remapped };
}
