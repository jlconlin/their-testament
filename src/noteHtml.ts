import { parse, type HTMLElement } from "node-html-parser";
import type { NoteInline, NoteNode } from "./types.ts";

/**
 * Convert a Gospel Library note's `content` HTML into a small structured model.
 * Supported: paragraphs (div / p / <br>), bold (b/strong), italic (i/em),
 * links (a), unordered/ordered lists, blockquotes. Everything else is unwrapped
 * to its text. Entities decoded; whitespace collapsed.
 */
export function parseNote(html: string | undefined): NoteNode[] {
  if (!html) return [];
  const root = parse(clean(html), { blockTextElements: {} });
  const blocks: NoteNode[] = [];
  let para: NoteInline[] = [];

  const flush = () => {
    if (para.length && !allBlank(para)) blocks.push({ t: "p", children: trimEnds(para) });
    para = [];
  };

  const inlineChildren = (el: HTMLElement): NoteInline[] => {
    const out: NoteInline[] = [];
    for (const c of el.childNodes) out.push(...inlineOf(c as unknown as HTMLElement));
    return out;
  };

  const inlineOf = (node: HTMLElement): NoteInline[] => {
    if ((node as { nodeType: number }).nodeType === 3) {
      const s = collapse((node as { text: string }).text ?? "");
      return s ? [{ t: "text", s }] : [];
    }
    const el = node;
    if (!el.tagName) {
      const s = collapse(el.text ?? "");
      return s ? [{ t: "text", s }] : [];
    }
    const tag = el.tagName.toLowerCase();
    if (tag === "b" || tag === "strong") return [{ t: "b", children: inlineChildren(el) }];
    if (tag === "i" || tag === "em") return [{ t: "i", children: inlineChildren(el) }];
    if (tag === "a") {
      let href: string | null = el.getAttribute("href") ?? null;
      if (href && href.startsWith("dayone:")) href = null; // private app link
      return [{ t: "link", href, children: inlineChildren(el) }];
    }
    if (tag === "br") return [{ t: "text", s: "\n" }];
    return inlineChildren(el); // unwrap span/font/code/etc.
  };

  const walkBlock = (el: HTMLElement): void => {
    for (const node of el.childNodes) {
      const n = node as unknown as HTMLElement;
      const tag = n.tagName?.toLowerCase();
      if (!tag) {
        para.push(...inlineOf(n));
        continue;
      }
      if (tag === "div" || tag === "p") {
        flush();
        walkBlock(n);
        flush();
      } else if (tag === "ul" || tag === "ol") {
        flush();
        const items = n
          .querySelectorAll("li")
          .map((li) => trimEnds(inlineChildren(li as unknown as HTMLElement)))
          .filter((it) => it.length);
        if (items.length) blocks.push({ t: tag, items });
      } else if (tag === "blockquote") {
        flush();
        blocks.push({ t: "quote", children: trimEnds(inlineChildren(n)) });
      } else if (tag === "br") {
        para.push({ t: "text", s: "\n" });
      } else {
        para.push(...inlineOf(n));
      }
    }
  };

  walkBlock(root);
  flush();
  return mergeSoftBreaks(blocks);
}

function clean(html: string): string {
  return html
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/ /g, " ");
}
function collapse(s: string): string {
  return s.replace(/\s+/g, " ");
}
function allBlank(inl: NoteInline[]): boolean {
  return inl.every((i) => i.t === "text" && !i.s.trim());
}
function trimEnds(inl: NoteInline[]): NoteInline[] {
  const a = [...inl];
  while (a.length && a[0]!.t === "text" && !(a[0] as { s: string }).s.trim()) a.shift();
  while (a.length && a.at(-1)!.t === "text" && !(a.at(-1) as { s: string }).s.trim()) a.pop();
  return a;
}
// Turn "\n" text nodes inside a paragraph into paragraph splits.
function mergeSoftBreaks(blocks: NoteNode[]): NoteNode[] {
  const out: NoteNode[] = [];
  for (const b of blocks) {
    if (b.t !== "p") {
      out.push(b);
      continue;
    }
    let cur: NoteInline[] = [];
    for (const inl of b.children) {
      if (inl.t === "text" && inl.s.includes("\n")) {
        const parts = inl.s.split("\n");
        cur.push({ t: "text", s: parts[0]! });
        for (const p of parts.slice(1)) {
          if (cur.length && !allBlank(cur)) out.push({ t: "p", children: trimEnds(cur) });
          cur = [{ t: "text", s: p }];
        }
      } else {
        cur.push(inl);
      }
    }
    if (cur.length && !allBlank(cur)) out.push({ t: "p", children: trimEnds(cur) });
  }
  return out;
}

/** Plain-text length, for sizing decisions. */
export function noteTextLength(blocks: NoteNode[]): number {
  const inlLen = (inl: NoteInline[]): number =>
    inl.reduce((s, i) => s + (i.t === "text" ? i.s.length : inlLen((i as { children: NoteInline[] }).children)), 0);
  return blocks.reduce((s, b) => {
    if (b.t === "ul" || b.t === "ol") return s + b.items.reduce((x, it) => x + inlLen(it), 0);
    return s + inlLen(b.children);
  }, 0);
}
