// Milestone 1 — the Old Testament Part, Job only, end to end.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContentClient } from "../src/contentApi.ts";
import { assembleBook, mergeTagIndex } from "../src/assemble.ts";
import { renderPdf } from "../src/render.ts";
import type { Annotation, DocBook } from "../src/types.ts";

const ROOT = resolve(import.meta.dirname, "..");
const RAW = resolve(ROOT, "data/raw/2026-09-02/annotations.json");

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
  const all: Annotation[] = JSON.parse(readFileSync(RAW, "utf8"));
  const job = all.filter((a) =>
    (a.highlights ?? []).some((h) => /\/scriptures\/ot\/job\/\d+/.test(h.uri ?? "")),
  );
  console.log(`Job annotations: ${job.length}`);

  const content = new ContentClient(resolve(ROOT, "data/cache/content"));
  const { part, report, tagEntries } = await assembleBook(
    job,
    { slug: "job", name: "Job", base: "/scriptures/ot", order: 18 }, // Job = 18th OT book
    content,
    "ot",
    "Old Testament",
  );

  // validation report
  const lines = [
    `location        mark              offsets      status                 sample`,
    "-".repeat(96),
    ...report.located.map(
      (r) =>
        `${r.ref.padEnd(15)} ${(`${r.color}/${r.style}`).padEnd(17)} ${r.offsets.padEnd(12)} ${r.status.padEnd(22)} ${r.sample}`,
    ),
  ];
  if (report.noVerseMatch.length) {
    lines.push("", "NO VERSE MATCH:", ...report.noVerseMatch);
  }
  writeFileSync(resolve(ROOT, "out/job/validation.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));

  const book: DocBook = {
    generatedAt: new Date().toISOString(),
    personName: null,
    title: "The Marked Scriptures — Job",
    margins: (process.env.MARGINS as "fixed" | "mirrored") ?? "fixed",
    parts: [part],
    tagIndex: mergeTagIndex(tagEntries),
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
