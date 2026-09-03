import type {
  Annotation, DocChapter, DocPart, DocVerse, Highlight, Mark, Note, TagIndexEntry, Verse,
} from "./types.ts";
export type { TagIndexEntry };

export interface TagEntry {
  tag: string;
  label: string;   // "Job 1:20"  |  "A 15 · Bednar"
  key: string;     // vkey link target
  showPage?: boolean;
  sort: [number, number, number]; // [book order, chapter, verse]
}

/** Merge tag entries from every book into one alphabetical index. */
export function mergeTagIndex(entries: TagEntry[]): TagIndexEntry[] {
  const byTag = new Map<string, Map<string, TagEntry>>();
  for (const e of entries) {
    const m = byTag.get(e.tag) ?? new Map();
    if (!m.has(e.key)) m.set(e.key, e);
    byTag.set(e.tag, m);
  }
  return [...byTag.entries()]
    .map(([name, m]) => ({
      name,
      refs: [...m.values()]
        .sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2])
        .map((e) => ({ label: e.label, key: e.key, showPage: e.showPage })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
import type { ContentClient } from "./contentApi.ts";
import { parseVerses } from "./verses.ts";
import { locate, type Located } from "./locate.ts";
import { parseNote } from "./noteHtml.ts";
import { segment } from "./segment.ts";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export interface AssembleReport {
  located: {
    ref: string; color: string; style: string;
    offsets: string; status: string; sample: string;
  }[];
  noVerseMatch: string[];
}

interface BookSpec {
  /** URI segment, e.g. "job" */
  slug: string;
  /** canonical book name, e.g. "Job" */
  name: string;
  /** parent path, e.g. "/scriptures/ot" */
  base: string;
  /** canonical position for index sorting */
  order: number;
}

const style = (h: Highlight): "fill" | "underline" => (h.style ? "underline" : "fill");

export async function assembleBook(
  annotations: Annotation[],
  spec: BookSpec,
  content: ContentClient,
  partKey: string,
  partTitle: string,
): Promise<{ part: DocPart; report: AssembleReport; tagEntries: TagEntry[] }> {
  const report: AssembleReport = { located: [], noVerseMatch: [] };

  const chapRe = new RegExp(`${spec.base}/${spec.slug}/(\\d+)(?:[.?]|$)`);
  const inBook = (h: Highlight) => chapRe.test(h.uri ?? "");

  // annotation -> chapters it touches
  const byChapter = new Map<number, Annotation[]>();
  for (const a of annotations) {
    const chs = new Set<number>();
    for (const h of a.highlights ?? []) {
      const m = (h.uri ?? "").match(chapRe);
      if (m) chs.add(Number(m[1]));
    }
    for (const c of chs) {
      const arr = byChapter.get(c) ?? [];
      arr.push(a);
      byChapter.set(c, arr);
    }
  }

  const chapters: DocChapter[] = [];
  const tagEntries: TagEntry[] = [];
  const vkey = (ch: number, ref: string) => `${partKey}|${ch}|${ref}`;

  for (const chapter of [...byChapter.keys()].sort((a, b) => a - b)) {
    const page = await content.get(`${spec.base}/${spec.slug}/${chapter}`);
    const verses = parseVerses(page);
    const byAid = new Map(verses.map((v) => [v.aid, v]));
    const byVid = new Map(verses.map((v) => [v.vid, v]));

    const marksByRef = new Map<string, Mark[]>();
    const notesByRef = new Map<string, Note[]>();

    for (const a of byChapter.get(chapter)!) {
      const hs = (a.highlights ?? []).filter(inBook);
      const spanRefs: string[] = [];
      const spanVerses: { v: Verse; h: Highlight; loc: Located }[] = [];

      for (const h of hs) {
        const v =
          byAid.get(h.pid) ??
          byVid.get((h.uri ?? "").match(/\.(p\d+)(?:[?]|$)/)?.[1] ?? "");
        if (!v) {
          report.noVerseMatch.push(`${spec.name} ${chapter}: ${h.uri}`);
          continue;
        }
        spanRefs.push(v.ref);
        if (h.color === "clear") {
          report.located.push({
            ref: `${spec.name} ${v.ref}`, color: "clear", style: "-",
            offsets: "-", status: "no visual mark", sample: "",
          });
          spanVerses.push({ v, h, loc: { start: 0, end: 0, substring: "", ok: true } });
          continue;
        }
        const loc = locate(v.text, h.startOffset, h.endOffset);
        marksByRef.set(v.ref, [
          ...(marksByRef.get(v.ref) ?? []),
          { start: loc.start, end: loc.end, color: h.color, style: style(h), substring: loc.substring },
        ]);
        spanVerses.push({ v, h, loc });
        report.located.push({
          ref: `${spec.name} ${v.ref}`,
          color: h.color, style: style(h),
          offsets: `${h.startOffset},${h.endOffset}`,
          status: loc.ok ? "OK" : `FALLBACK: ${loc.reason}`,
          sample: loc.substring.slice(0, 60),
        });
      }

      const hasText = !!(a.note?.content || a.note?.title);
      if (!hasText && a.tags.length === 0) continue;

      const anchorRef = spanRefs[0];
      if (!anchorRef) continue;

      const first = spanVerses[0];
      const mark =
        first && first.h.color !== "clear"
          ? { color: first.h.color, style: style(first.h) }
          : null;

      const refLabel =
        spanRefs.length > 1
          ? `${spanRefs[0]}–${spanRefs.at(-1)!.split(":").at(-1)}`
          : spanRefs[0]!;

      notesByRef.set(anchorRef, [
        ...(notesByRef.get(anchorRef) ?? []),
        {
          refLabel,
          mark,
          isReference: a.type === "reference",
          title: a.note?.title ?? null,
          body: parseNote(a.note?.content),
          tags: a.tags.map((t) => t.name),
          created: (a.created ?? "").slice(0, 10),
          spanRefs,
          // `letter`, and the span-position sort key, filled in below
          _spanStart: first?.loc.start ?? 0,
        } as Note & { _spanStart: number },
      ]);

      for (const t of a.tags) {
        const [c, vn] = anchorRef.split(":").map(Number);
        tagEntries.push({
          tag: t.name,
          label: `${spec.name} ${anchorRef}`,
          key: vkey(chapter, anchorRef),
          sort: [spec.order, c ?? chapter, vn ?? 0],
        });
      }
    }

    // per-verse: order notes by span position, assign a/b letters when >1
    for (const [ref, notes] of notesByRef) {
      notes.sort((x, y) => (x as any)._spanStart - (y as any)._spanStart);
      if (notes.length > 1) {
        notes.forEach((n, i) => (n.letter = LETTERS[i]));
        // echo the letter onto the matching mark (first mark at that span start)
        const marks = marksByRef.get(ref) ?? [];
        for (const n of notes) {
          const start = (n as any)._spanStart as number;
          const m = marks.find((mk) => mk.start === start && !mk.letter);
          if (m) m.letter = n.letter;
        }
      }
      for (const n of notes) delete (n as any)._spanStart;
    }

    // shown verses = any with a mark or a note; build runs; gap detection
    const shownRefs = new Set([...marksByRef.keys(), ...notesByRef.keys()]);
    const shown = verses
      .filter((v) => shownRefs.has(v.ref))
      .sort((a, b) => a.num - b.num);

    const docVerses: DocVerse[] = [];
    let prevNum: number | null = null;
    for (const v of shown) {
      const vmarks = (marksByRef.get(v.ref) ?? []).sort((a, b) => a.start - b.start);
      docVerses.push({
        ref: v.ref,
        num: v.num,
        runs: segment(v.text, vmarks, v.styles),
        marks: vmarks,
        notes: notesByRef.get(v.ref) ?? [],
        gapBefore: prevNum !== null && v.num - prevNum > 1,
      });
      prevNum = v.num;
    }

    chapters.push({
      book: spec.name,
      chapter,
      reference: `${spec.name} ${chapter}`,
      verses: docVerses,
    });
  }

  return {
    part: { kind: "scripture", key: partKey, title: partTitle, chapters },
    report,
    tagEntries,
  };
}
