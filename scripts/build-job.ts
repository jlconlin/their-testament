// Milestone 1 — the Old Testament Part, Job only, end to end.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContentClient } from "../src/contentApi.ts";
import { assembleScriptureBook, buildScripturePart, mergeTagIndex } from "../src/assemble.ts";
import { renderPdf } from "../src/render.ts";
import { loadExport } from "./_data.ts";
import type { Annotation, DocBook } from "../src/types.ts";

const ROOT = resolve(import.meta.dirname, "..");

function jobStats(anns: Annotation[]) {
  const dates = anns.map((a) => a.created).filter(Boolean).sort();
  const verses = new Set<string>();
  let notes = 0;
  const tagCount = new Map<string, number>();
  for (const a of anns) {
    for (const h of a.highlights ?? []) if (h.uri) verses.add(h.uri);
    if (a.note?.content) notes++;
    for (const t of a.tags) tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
  }
  const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return {
    dateRange: [dates[0] ?? "", dates.at(-1) ?? ""] as [string, string],
    versesMarked: verses.size,
    notesWritten: notes,
    tagsUsed: tagCount.size,
    topTags,
  };
}

async function main() {
  const all: Annotation[] = loadExport().annotations;
  const job = all.filter((a) =>
    (a.highlights ?? []).some((h) => /\/scriptures\/ot\/job\/\d+/.test(h.uri ?? "")),
  );
  console.log(`Job annotations: ${job.length}`);

  const content = new ContentClient(resolve(ROOT, "data/cache/content"));
  const spec = {
    slug: "job", name: "Job", abbrev: "Job", base: "/scriptures/ot", order: 18, partKey: "ot",
  };
  const result = await assembleScriptureBook(job, spec, content);
  const part = buildScripturePart("ot", "Old Testament", [{ spec, result }]);

  const fails = result.diags.filter((d) => !["located", "clear"].includes(d.category));
  writeFileSync(
    resolve(ROOT, "out/job/validation.txt"),
    result.located.map((r) => `${r.ref}  ${r.status}`).join("\n") +
      `\n\n${fails.length} non-clean rows:\n` + fails.map((d) => `  ${d.category} ${d.unitRef} ${d.detail ?? ""}`).join("\n") + "\n",
  );
  console.log(`${result.located.length} marks, ${fails.length} non-clean`);

  const book: DocBook = {
    generatedAt: new Date().toISOString(),
    personName: null,
    title: "The Marked Scriptures — Job",
    margins: (process.env.MARGINS as "fixed" | "mirrored") ?? "fixed",
    parts: [part],
    tagIndex: mergeTagIndex(result.tagEntries),
    stats: jobStats(job),
  };

  const { pdf } = renderPdf({
    book,
    projectRoot: ROOT,
    template: "templates/book.typ",
    outPdf: "out/job/job.pdf",
  });
  console.log(`\nwrote ${pdf}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
