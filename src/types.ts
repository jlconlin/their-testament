// ---------------------------------------------------------------------------
// Gospel Library annotation shapes (v3 Notes API `annotationsWithMeta`)
// ---------------------------------------------------------------------------

export type MarkColor =
  | "red" | "pink" | "orange" | "yellow" | "green"
  | "blue" | "dark_blue" | "purple" | "brown" | "gray" | "clear";

export interface Highlight {
  uri?: string;            // e.g. "/scriptures/ot/job/1.p9"
  pid: string;             // e.g. "128432848"  (== the verse <p data-aid>)
  color: MarkColor;
  style?: "red-underline"; // present => rendered as an underline, not a fill
  mediaType?: string;
  startOffset: number;     // 1-indexed word position; -1 = from start
  endOffset: number;       // 1-indexed word position; -1 = through end
}

export interface Tag {
  tagId: string;
  name: string;
  timestamp?: string;
  created?: string;
  annotationsCount?: number;
}

export interface Folder {
  folderId?: string;
  name: string;
}

export interface Annotation {
  annotationId: string;
  type: "highlight" | "reference" | "journal" | string;
  locale: string;
  personId?: string;
  source?: string;
  device?: string;
  created: string;
  lastUpdated: string;
  contentVersion?: number;
  docId?: string;
  uri?: string;
  note?: { title?: string; content?: string };
  highlights?: Highlight[];
  tags: Tag[];
  folders: Folder[];
}

// ---------------------------------------------------------------------------
// Church content API (`/study/api/v3/language-pages/type/content`)
// ---------------------------------------------------------------------------

export interface ContentPage {
  meta: {
    title: string;
    canonicalUrl?: string;
    pageAttributes?: Record<string, string>;
    structuredData?: string;
  };
  content: { head?: unknown; body: string; footnotes?: Record<string, unknown> };
  pids: [string, unknown][];
  uri: string;
}

// ---------------------------------------------------------------------------
// Parsed verse
// ---------------------------------------------------------------------------

export type InlineStyleKind = "small-caps" | "italic";

export interface Verse {
  ref: string;    // "1:1"
  vid: string;    // "p1"
  aid: string;    // "128432840"  (matches Highlight.pid)
  num: number;
  text: string;   // reading text, whitespace-collapsed, no verse number / footnote letters
  styles: [number, number, InlineStyleKind][];
}

// ---------------------------------------------------------------------------
// Doc model handed to the renderer
// ---------------------------------------------------------------------------

export interface Mark {
  start: number;
  end: number;
  color: MarkColor;
  style: "fill" | "underline";
  letter?: string;       // "a", "b", ... when the verse has >1 note
  substring: string;
}

export interface Run {
  text: string;
  fill: MarkColor | null;
  underline: MarkColor | null;
  italic: boolean;
  smallcaps: boolean;
  letter?: string;       // disambiguation marker rendered as a superscript at run start
}

// Structured note body (from note HTML)
export type NoteNode =
  | { t: "p"; children: NoteInline[] }
  | { t: "ul"; items: NoteInline[][] }
  | { t: "ol"; items: NoteInline[][] }
  | { t: "quote"; children: NoteInline[] };

export type NoteInline =
  | { t: "text"; s: string }
  | { t: "b"; children: NoteInline[] }
  | { t: "i"; children: NoteInline[] }
  | { t: "link"; href: string | null; children: NoteInline[] };

export interface Note {
  refLabel: string;           // "1:9" or "1:20–22"
  letter?: string;            // "a" / "b" ...
  mark: { color: MarkColor; style: "fill" | "underline" } | null;
  isReference: boolean;
  title: string | null;
  body: NoteNode[];
  tags: string[];
  created: string;
  spanRefs: string[];
}

export interface DocVerse {
  ref: string;
  num: number;
  runs: Run[];
  marks: Mark[];
  notes: Note[];
  gapBefore: boolean;         // non-contiguous with the previous shown verse
}

export interface DocChapter {
  book: string;
  chapter: number;
  reference: string;          // "Job 1"
  chapterWord: string;        // "Chapter" | "Psalm" | "Section"
  verses: DocVerse[];
}

// General Conference ---------------------------------------------------------

export interface DocTalk {
  slug: string;
  title: string;
  speaker: string;            // "Dieter F. Uchtdorf"
  role: string | null;       // "Second Counselor in the First Presidency"
  paragraphs: DocVerse[];    // same shape as verses; `num` is the paragraph ordinal
}

export interface DocConference {
  key: string;                // "2015-04"
  label: string;              // "April 2015"
  talks: DocTalk[];
}

export interface TagRef {
  label: string;              // "Job 1:20"  |  "A 15 · Bednar"
  key: string;                // vkey — link target
  showPage?: boolean;         // append a part-relative "· p. N" (GC, where there's no verse ref)
}

export interface TagIndexEntry {
  name: string;
  refs: TagRef[];
}

// Notebooks (Gospel Library "folders") — curated collections -----------------

export type NotebookEntry =
  | { kind: "text"; title: string | null; body: NoteNode[]; created: string }
  | {
      kind: "passage";
      refLabel: string;        // "Rev. 5:12–14"  |  "Eyring, “Is Not This the Fast” ¶ 7"
      verses: DocVerse[];      // the passage text + any highlight + note
      created: string;
    }
  | { kind: "citation"; refLabel: string; note: string | null; created: string }; // unavailable source

export interface DocNotebook {
  name: string;
  description: NoteNode[] | null; // epigraph, if the notebook opens with a descriptive text entry
  entries: NotebookEntry[];
}

export type DocPart =
  | { kind: "scripture"; key: string; title: string; chapters: DocChapter[] }
  | { kind: "gc"; key: string; title: string; conferences: DocConference[] }
  | { kind: "notebooks"; key: string; title: string; notebooks: DocNotebook[] };

export interface DocBook {
  generatedAt: string;
  personName: string | null;
  title?: string;
  margins: "fixed" | "mirrored";
  parts: DocPart[];
  tagIndex: TagIndexEntry[];
  stats: {
    dateRange: [string, string];
    versesMarked: number;
    notesWritten: number;
    tagsUsed: number;
    topTags: [string, number][];
  };
}
