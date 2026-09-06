// Milestone 2 — the General Conference Part, April 2015 only.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ContentClient } from "../src/contentApi.ts";
import { assembleConferencePart } from "../src/assembleGC.ts";
import { mergeTagIndex } from "../src/assemble.ts";
import { renderPdf } from "../src/render.ts";
import { loadExport } from "./_data.ts";
import type { Annotation, DocBook } from "../src/types.ts";

const ROOT = resolve(import.meta.dirname, "..");

async function main() {
  const all: Annotation[] = loadExport().annotations;
  const gc = all.filter((a) =>
    (a.highlights ?? []).some((h) => /\/general-conference\/2015\/04\//.test(h.uri ?? "")),
  );
  console.log(`April 2015 GC annotations: ${gc.length}`);

  const content = new ContentClient(resolve(ROOT, "data/cache/content"));
  const { part, tagEntries, located, noMatch } = await assembleConferencePart(
    gc,
    [{ year: "2015", month: "04" }],
    content,
  );

  mkdirSync(resolve(ROOT, "out/gc"), { recursive: true });
  writeFileSync(
    resolve(ROOT, "out/gc/validation.txt"),
    located.join("\n") + (noMatch.length ? "\n\nNO MATCH:\n" + noMatch.join("\n") : "") + "\n",
  );

  const talks = part.kind === "gc" ? part.conferences.flatMap((c) => c.talks) : [];
  const paras = talks.reduce((s, t) => s + t.paragraphs.length, 0);
  console.log(`talks: ${talks.length}, rendered paragraphs: ${paras}, located rows: ${located.length}`);

  const dates = gc.map((a) => a.created).filter(Boolean).sort();
  const tagCount = new Map<string, number>();
  let notes = 0;
  for (const a of gc) {
    if (a.note?.content) notes++;
    for (const t of a.tags) tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
  }

  const book: DocBook = {
    generatedAt: new Date().toISOString(),
    personName: null,
    title: "Scripture Markings — General Conference, April 2015",
    margins: (process.env.MARGINS as "fixed" | "mirrored") ?? "fixed",
    parts: [part],
    tagIndex: mergeTagIndex(tagEntries),
    stats: {
      dateRange: [dates[0] ?? "", dates.at(-1) ?? ""],
      versesMarked: new Set(gc.flatMap((a) => (a.highlights ?? []).map((h) => h.uri))).size,
      notesWritten: notes,
      tagsUsed: tagCount.size,
      topTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    },
  };

  const { pdf } = renderPdf({
    book, projectRoot: ROOT, template: "templates/book.typ", outPdf: "out/gc/gc.pdf",
  });
  console.log(`wrote ${pdf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
