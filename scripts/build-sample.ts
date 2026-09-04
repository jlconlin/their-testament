// Build a small SYNTHETIC sample PDF (invented notes, no real family data) to
// attach to the Church permissions request -- shows a reviewer exactly what
// the tool produces: a verse, its highlight color, and a margin note.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ContentClient } from "../src/contentApi.ts";
import { parseVerses } from "../src/verses.ts";
import { assembleScriptureBook, buildScripturePart, mergeTagIndex } from "../src/assemble.ts";
import { renderPdf } from "../src/render.ts";
import type { Annotation, DocBook, MarkColor } from "../src/types.ts";

const ROOT = resolve(import.meta.dirname, "..");

function fakeAnn(id: string, uri: string, pid: string, color: MarkColor,
  style: "underline" | undefined, start: number, end: number, note?: string, tags: string[] = []): Annotation {
  return {
    annotationId: id, type: "highlight", locale: "eng",
    created: "2024-01-01T00:00:00.000Z", lastUpdated: "2024-01-01T00:00:00.000Z",
    uri, note: note ? { content: `<p>${note}</p>` } : undefined,
    highlights: [{ uri: `${uri}.p${pid}`, pid, color, style: style ? "red-underline" : undefined, startOffset: start, endOffset: end }],
    tags: tags.map((t) => ({ tagId: t, name: t })),
    folders: [],
  } as Annotation;
}

async function main() {
  const content = new ContentClient(resolve(ROOT, "data/cache/content"));

  // Psalm 23
  const psPage = await content.get("/scriptures/ot/ps/23");
  const psVerses = parseVerses(psPage, 23);
  const v1 = psVerses.find((v) => v.num === 1)!;
  const v4 = psVerses.find((v) => v.num === 4)!;
  const psAnns = [
    fakeAnn("sample-ps-1", "/scriptures/ot/ps/23", v1.aid, "yellow", undefined, -1, -1,
      "He <em>is</em> — present tense. Not someday. The care is happening now.", ["shepherd"]),
    fakeAnn("sample-ps-2", "/scriptures/ot/ps/23", v4.aid, "dark_blue", "underline", -1, -1,
      "<em>Through</em>, never around. He doesn't take the valley away."),
  ];
  const psSpec = { slug: "ps", name: "Psalms", abbrev: "Ps.", base: "/scriptures/ot", order: 19, partKey: "ot", chapterWord: "Psalm" };
  const psResult = await assembleScriptureBook(psAnns, psSpec, content);

  // Alma 32
  const almaPage = await content.get("/scriptures/bofm/alma/32");
  const almaVerses = parseVerses(almaPage, 32);
  const v21 = almaVerses.find((v) => v.num === 21)!;
  const v27 = almaVerses.find((v) => v.num === 27)!;
  const almaAnns = [
    fakeAnn("sample-alma-1", "/scriptures/bofm/alma/32", v21.aid, "yellow", undefined, -1, -1,
      "Hope and evidence aren't opposites. Faith holds both."),
    fakeAnn("sample-alma-2", "/scriptures/bofm/alma/32", v27.aid, "dark_blue", "underline", -1, -1,
      "An experiment: you have to actually try it."),
  ];
  const almaSpec = { slug: "alma", name: "Alma", abbrev: "Alma", base: "/scriptures/bofm", order: 8, partKey: "bofm" };
  const almaResult = await assembleScriptureBook(almaAnns, almaSpec, content);

  const otPart = buildScripturePart("ot", "Old Testament", [{ spec: psSpec, result: psResult }]);
  const bofmPart = buildScripturePart("bofm", "Book of Mormon", [{ spec: almaSpec, result: almaResult }]);

  const book: DocBook = {
    generatedAt: new Date().toISOString(),
    personName: null,
    title: "Their Testament — Sample Pages (synthetic, for illustration)",
    margins: "fixed",
    parts: [otPart, bofmPart],
    tagIndex: mergeTagIndex([...psResult.tagEntries, ...almaResult.tagEntries]),
    stats: { dateRange: ["2024-01-01", "2024-01-01"], versesMarked: 4, notesWritten: 4, tagsUsed: 1, topTags: [["shepherd", 1]] },
  };

  const { pdf } = renderPdf({ book, projectRoot: ROOT, template: "templates/book.typ", outPdf: "out/sample/their-testament-sample.pdf" });
  console.log(`wrote ${pdf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
