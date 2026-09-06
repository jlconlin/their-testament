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
export function parseVerses(page: ContentPage, chapter?: number): Verse[] {
  const root = parse(page.content.body, { blockTextElements: {} });
  const verses: Verse[] = [];

  for (const p of root.querySelectorAll("p.verse")) {
    const vid = p.getAttribute("id") ?? "";
    const aid = p.getAttribute("data-aid") ?? "";
    const engRef = p.getAttribute("data-eng-ref"); // OT/NT only: "38:1"

    // verse number: from the .verse-number span (all standard works have it),
    // falling back to data-eng-ref or sequence.
    const vnSpan = p.querySelector(".verse-number")?.text ?? "";
    const vnMatch = vnSpan.match(/\d+/);
    const num = vnMatch
      ? Number(vnMatch[0])
      : engRef
        ? Number(engRef.split(":")[1])
        : verses.length + 1;

    // ref is always "chapter:verse" so anchoring/index keys are uniform across
    // OT/NT (which carry data-eng-ref) and BoM/D&C/PoGP (which don't).
    const ref = chapter != null ? `${chapter}:${num}` : engRef ?? `${num}`;

    const { text, styles } = extract(p);
    // the verse number was stripped from `text`, but the offsets still count it
    verses.push({ ref, vid, aid, num, text, styles, leadingTokens: vnMatch ? 1 : 0 });
  }
  if (verses.length > 0) return verses;

  // Official Declarations (and anything else published without verse markup)
  // carry no `p.verse` at all -- just numbered paragraphs, more like a talk
  // than a chapter. Without this they parse to nothing, every highlight on
  // them reports pid-no-match, and any note goes to Miscellaneous. They have
  // no verse number either, so nothing is stripped and leadingTokens is 0.
  for (const p of root.querySelectorAll("p[id]")) {
    const vid = p.getAttribute("id") ?? "";
    if (!/^p\d+$/.test(vid)) continue;
    const aid = p.getAttribute("data-aid") ?? "";
    const { text, styles } = extract(p);
    if (!text.trim()) continue;
    const num = Number(vid.slice(1));
    verses.push({
      ref: chapter != null ? `${chapter}:${num}` : String(num),
      vid, aid, num, text, styles, leadingTokens: 0,
    });
  }
  return verses;
}

/**
 * The chapter's furniture -- its summary/intro line -- as addressable units.
 *
 * Not part of the book's apparatus by default (decision 8: headings and verse
 * text only). But a person who highlighted the summary marked those words, and
 * a mark with nowhere to appear is a mark silently dropped. Callers include
 * one only when a highlight actually lands on it.
 */
export function parseHeadingUnits(page: ContentPage): Verse[] {
  const root = parse(page.content.body, { blockTextElements: {} });
  const out: Verse[] = [];
  for (const sel of ["p.study-intro", "p.study-summary", "p.studyIntro", "p.intro", "p.subtitle", "p.kicker",
                     "#study_intro1", "#study_summary1", ".study-intro", ".study-summary"]) {
    for (const el of root.querySelectorAll(sel)) {
      const vid = el.getAttribute("id") ?? "";
      const aid = el.getAttribute("data-aid") ?? "";
      if (!aid || out.some((u) => u.aid === aid)) continue;
      const { text, styles } = extract(el);
      if (!text.trim()) continue;
      out.push({ ref: vid || aid, vid, aid, num: 0, text, styles, leadingTokens: 0 });
    }
  }
  return out;
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
