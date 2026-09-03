import type {
  Annotation, DocChapter, DocPart, Highlight, TagIndexEntry,
} from "./types.ts";
import type { ContentClient } from "./contentApi.ts";
import { parseVerses } from "./verses.ts";
import { assembleUnits, type Diag } from "./units.ts";

export type { TagIndexEntry };

export interface TagEntry {
  tag: string;
  label: string;   // "Job 1:20"  |  "A-15, Bednar"
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

export interface BookSpec {
  slug: string;       // "job"
  name: string;       // "Job"
  base: string;       // "/scriptures/ot"
  order: number;      // canonical position (for the index sort)
  partKey: string;    // "ot"
  chapterWord?: string; // "Chapter" | "Psalm" | "Section"
}

export interface BookResult {
  chapters: DocChapter[];
  tagEntries: TagEntry[];
  diags: Diag[];
  located: { ref: string; status: string }[];
}

const CH_KEY = (partKey: string, ch: number) => `${partKey}|${ch}`;

/** Assemble one scripture book. Chapters are grouped into a Part by the caller. */
export async function assembleScriptureBook(
  annotations: Annotation[],
  spec: BookSpec,
  content: ContentClient,
): Promise<BookResult> {
  const chapRe = new RegExp(`${spec.base}/${spec.slug}/(\\d+)(?:[.?#]|$)`);
  const inBook = (h: Highlight) => chapRe.test(h.uri ?? "");

  const byChapter = new Map<number, Annotation[]>();
  for (const a of annotations) {
    const chs = new Set<number>();
    for (const h of a.highlights ?? []) {
      const m = (h.uri ?? "").match(chapRe);
      if (m) chs.add(Number(m[1]));
    }
    for (const c of chs) byChapter.set(c, [...(byChapter.get(c) ?? []), a]);
  }

  const chapters: DocChapter[] = [];
  const tagEntries: TagEntry[] = [];
  const diags: Diag[] = [];
  const located: { ref: string; status: string }[] = [];

  for (const chapter of [...byChapter.keys()].sort((a, b) => a - b)) {
    const page = await content.tryGet(`${spec.base}/${spec.slug}/${chapter}`);
    if (!page) {
      for (const a of byChapter.get(chapter)!) {
        diags.push({
          annotationId: a.annotationId, created: (a.created ?? "").slice(0, 10),
          unitRef: `${chapter}`, category: "pid-no-match", detail: "content fetch failed",
        });
      }
      continue;
    }
    const verses = parseVerses(page, chapter);

    const res = assembleUnits(verses, byChapter.get(chapter)!, {
      inScope: inBook,
      label: `${spec.name} ${chapter}`,
      rangeLabel: (refs) => `${refs[0]}–${refs.at(-1)!.split(":").at(-1)}`,
      unitLabel: (ref) => ref,
    });

    for (const d of res.diags) diags.push({ ...d, unitRef: `${spec.name} ${d.unitRef}` });
    located.push(...res.located.map((r) => ({ ref: r.ref, status: r.status })));

    for (const { tag, ref } of res.tagRefs) {
      // ref is now "chapter:verse"
      const v = Number(ref.split(":")[1]);
      tagEntries.push({
        tag,
        label: `${spec.name} ${ref}`,
        key: `${spec.partKey}|${chapter}|${ref}`,
        sort: [spec.order, chapter, v || 0],
      });
    }

    if (res.docVerses.length > 0) {
      chapters.push({
        book: spec.name,
        chapter,
        reference: `${spec.name} ${chapter}`,
        chapterWord: spec.chapterWord ?? "Chapter",
        verses: res.docVerses,
      });
    }
  }

  return { chapters, tagEntries, diags, located };
}

/** Group already-assembled books into scripture Parts, in canonical order. */
export function buildScripturePart(
  partKey: string,
  partTitle: string,
  books: { spec: BookSpec; result: BookResult }[],
): DocPart {
  const ordered = [...books].sort((a, b) => a.spec.order - b.spec.order);
  return {
    kind: "scripture",
    key: partKey,
    title: partTitle,
    chapters: ordered.flatMap((b) => b.result.chapters),
  };
}
