// Shared: map a set of annotations onto parsed units (scripture verses or talk
// paragraphs) and produce render-ready DocVerse[] plus tag references.

import type { Annotation, DocVerse, Highlight, Mark, Note, Verse } from "./types.ts";
import { locate, type Located } from "./locate.ts";
import { parseNote } from "./noteHtml.ts";
import { segment } from "./segment.ts";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const style = (h: Highlight): "fill" | "underline" => (h.style ? "underline" : "fill");

export interface LocatedRow {
  ref: string; color: string; style: string;
  offsets: string; status: string; sample: string;
}

export type DiagCategory =
  | "located"            // highlight span resolved cleanly
  | "whole-unit-fallback" // offsets out of range → highlighted whole unit
  | "empty-span"          // offsets produced a zero-length span → whole unit
  | "pid-no-match"        // highlight's paragraph id / uri matched no parsed unit
  | "clear"              // clear colour — intentionally no visual mark
  | "note-no-anchor"     // annotation has a note/tags but no highlight to anchor it
  | "note-parse-empty";  // note had content but parsed to nothing

export interface Diag {
  annotationId: string;
  created: string;       // YYYY-MM-DD
  unitRef: string;       // e.g. "1:20" or "p5"
  category: DiagCategory;
  detail?: string;
  noteChars?: number;
  noteFeatures?: string[]; // "link" | "list" | "quote" | "bold" | "italic" | "multiline"
}

export interface UnitsResult {
  docVerses: DocVerse[];
  /** (tag, unit-ref) pairs; caller adds book/talk qualifiers + sort keys */
  tagRefs: { tag: string; ref: string }[];
  located: LocatedRow[];
  noMatch: string[];
  diags: Diag[];
  /** verses/paragraphs carrying >1 note */
  multiNoteUnits: number;
}

export function assembleUnits(
  units: Verse[],
  anns: Annotation[],
  opts: {
    /** matches highlight uris that belong here, e.g. /\/job\/(\d+)/ */
    inScope: (h: Highlight) => boolean;
    /** label prefix for the located-rows report */
    label: string;
    /** how to render a multi-unit note's ref (e.g. "1:20–22" or "¶ 5–7") */
    rangeLabel: (refs: string[]) => string;
    /** how a single-unit note's ref reads (e.g. "1:20" or "¶ 5") */
    unitLabel: (ref: string) => string;
  },
): UnitsResult {
  const byAid = new Map(units.map((u) => [u.aid, u]));
  const byVid = new Map(units.map((u) => [u.vid, u]));
  const marksByRef = new Map<string, Mark[]>();
  const notesByRef = new Map<string, Note[]>();
  const tagRefs: { tag: string; ref: string }[] = [];
  const located: LocatedRow[] = [];
  const noMatch: string[] = [];
  const diags: Diag[] = [];

  const noteFeatures = (html: string | undefined, body: ReturnType<typeof parseNote>): string[] => {
    const f: string[] = [];
    if (!html) return f;
    if (/<a\s/i.test(html)) f.push("link");
    if (/<(ul|ol)\b/i.test(html)) f.push("list");
    if (/<blockquote\b/i.test(html)) f.push("quote");
    if (/<(b|strong)\b/i.test(html)) f.push("bold");
    if (/<(i|em)\b/i.test(html)) f.push("italic");
    if (body.length > 1) f.push("multiblock");
    return f;
  };

  for (const a of anns) {
    const created = (a.created ?? "").slice(0, 10);
    const hs = (a.highlights ?? []).filter(opts.inScope);
    const spanRefs: string[] = [];
    const spanUnits: { u: Verse; h: Highlight; loc: Located }[] = [];

    for (const h of hs) {
      const u =
        byAid.get(h.pid) ??
        byVid.get((h.uri ?? "").match(/\.(p[\w-]+)(?:[?]|$)/)?.[1] ?? "");
      if (!u) {
        noMatch.push(`${opts.label}: ${h.uri}`);
        diags.push({ annotationId: a.annotationId, created, unitRef: h.pid, category: "pid-no-match", detail: h.uri });
        continue;
      }
      spanRefs.push(u.ref);
      if (h.color === "clear") {
        located.push({ ref: `${opts.label} ${u.ref}`, color: "clear", style: "-", offsets: "-", status: "no visual mark", sample: "" });
        spanUnits.push({ u, h, loc: { start: 0, end: 0, substring: "", ok: true } });
        diags.push({ annotationId: a.annotationId, created, unitRef: u.ref, category: "clear" });
        continue;
      }
      const loc = locate(u.text, h.startOffset, h.endOffset);
      marksByRef.set(u.ref, [
        ...(marksByRef.get(u.ref) ?? []),
        { start: loc.start, end: loc.end, color: h.color, style: style(h), substring: loc.substring },
      ]);
      spanUnits.push({ u, h, loc });
      located.push({
        ref: `${opts.label} ${u.ref}`, color: h.color, style: style(h),
        offsets: `${h.startOffset},${h.endOffset}`,
        status: loc.ok ? "OK" : `FALLBACK: ${loc.reason}`,
        sample: loc.substring.slice(0, 60),
      });
      let cat: DiagCategory = "located";
      if (!loc.ok) cat = (loc.reason ?? "").startsWith("empty span") ? "empty-span" : "whole-unit-fallback";
      diags.push({ annotationId: a.annotationId, created, unitRef: u.ref, category: cat, detail: loc.ok ? undefined : loc.reason });
    }

    const hasText = !!(a.note?.content || a.note?.title);
    if (!hasText && a.tags.length === 0) continue;
    const anchorRef = spanRefs[0];
    if (!anchorRef) {
      diags.push({ annotationId: a.annotationId, created, unitRef: "-", category: "note-no-anchor",
        detail: (a.highlights ?? []).map((h) => h.uri).join(",") });
      continue;
    }

    const first = spanUnits[0];
    const mark = first && first.h.color !== "clear"
      ? { color: first.h.color, style: style(first.h) }
      : null;
    const refLabel = spanRefs.length > 1 ? opts.rangeLabel(spanRefs) : opts.unitLabel(spanRefs[0]!);
    const body = parseNote(a.note?.content);
    if (a.note?.content && body.length === 0) {
      diags.push({ annotationId: a.annotationId, created, unitRef: anchorRef, category: "note-parse-empty" });
    }
    if (hasText || a.tags.length) {
      diags.push({
        annotationId: a.annotationId, created, unitRef: anchorRef, category: "located",
        noteChars: a.note?.content ? a.note.content.replace(/<[^>]+>/g, "").length : 0,
        noteFeatures: noteFeatures(a.note?.content, body),
      });
    }

    notesByRef.set(anchorRef, [
      ...(notesByRef.get(anchorRef) ?? []),
      {
        refLabel, mark,
        isReference: a.type === "reference",
        title: a.note?.title ?? null,
        body,
        tags: a.tags.map((t) => t.name),
        created,
        spanRefs,
        _spanStart: first?.loc.start ?? 0,
      } as Note & { _spanStart: number },
    ]);
    for (const t of a.tags) tagRefs.push({ tag: t.name, ref: anchorRef });
  }

  // per-unit: order notes by span position; a/b letters when >1
  for (const [ref, notes] of notesByRef) {
    notes.sort((x, y) => (x as any)._spanStart - (y as any)._spanStart);
    if (notes.length > 1) {
      notes.forEach((n, i) => (n.letter = LETTERS[i]));
      const marks = marksByRef.get(ref) ?? [];
      for (const n of notes) {
        const m = marks.find((mk) => mk.start === (n as any)._spanStart && !mk.letter);
        if (m) m.letter = n.letter;
      }
    }
    for (const n of notes) delete (n as any)._spanStart;
  }

  const shownRefs = new Set([...marksByRef.keys(), ...notesByRef.keys()]);
  const shown = units.filter((u) => shownRefs.has(u.ref)).sort((a, b) => a.num - b.num);

  const docVerses: DocVerse[] = [];
  let prev: number | null = null;
  for (const u of shown) {
    const vmarks = (marksByRef.get(u.ref) ?? []).sort((a, b) => a.start - b.start);
    docVerses.push({
      ref: u.ref, num: u.num,
      runs: segment(u.text, vmarks, u.styles),
      marks: vmarks,
      notes: notesByRef.get(u.ref) ?? [],
      gapBefore: prev !== null && u.num - prev > 1,
    });
    prev = u.num;
  }

  const multiNoteUnits = [...notesByRef.values()].filter((ns) => ns.length > 1).length;
  return { docVerses, tagRefs, located, noMatch, diags, multiNoteUnits };
}
