// M3 — full-corpus validation.
//
//   npx tsx scripts/validate.ts            # parse + locate every in-scope annotation, write a report
//   npx tsx scripts/validate.ts --render   # also typeset the full book and measure size/time/memory
//
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ContentClient } from "../src/contentApi.ts";
import { assembleScriptureBook, buildScripturePart, mergeTagIndex, type TagEntry, type BookResult } from "../src/assemble.ts";
import { assembleConferencePart } from "../src/assembleGC.ts";
import { assembleNotebooksPart } from "../src/notebooks.ts";
import { classify, SCRIPTURE_PARTS, bookName, chapterWord, abbrev } from "../src/scripture.ts";
import { FAIL_CATEGORIES, WARN_CATEGORIES, OK_CATEGORIES } from "../src/diagSummary.ts";
import { renderPdf } from "../src/render.ts";
import { loadExport } from "./_data.ts";
import type { Annotation, DocBook, DocPart } from "../src/types.ts";
import type { Diag, UnplacedNote } from "../src/units.ts";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "out/validate");
const RENDER = process.argv.includes("--render");

const yearOf = (d: string) => d.slice(0, 4) || "?";
const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(2) + "%" : "—");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const exportFile = loadExport();
  const all: Annotation[] = exportFile.annotations;

  // ---- 1. classify every annotation -------------------------------------------
  const scope = {
    scripture: new Map<string, Annotation[]>(), // partKey|bookSlug -> anns
    gc: [] as Annotation[],
    studyNotebook: [] as Annotation[],
    out: new Map<string, number>(),        // source -> count
    uncategorised: [] as { a: Annotation; reason: string; uri: string }[],
  };
  const bookMeta = new Map<string, { collection: string; slug: string; order: number; partKey: string; base: string }>();

  for (const a of all) {
    if (a.type === "journal" && !(a.highlights ?? []).length) { scope.studyNotebook.push(a); continue; }
    // use the first classifiable highlight
    let placed = false;
    for (const h of a.highlights ?? []) {
      const c = classify(h.uri);
      if (c.scope === "scripture") {
        const k = `${c.partKey}|${c.bookSlug}`;
        scope.scripture.set(k, [...(scope.scripture.get(k) ?? []), a]);
        bookMeta.set(k, { collection: c.collection, slug: c.bookSlug, order: c.bookOrder, partKey: c.partKey, base: `/scriptures/${c.collection}` });
        placed = true; break;
      }
      if (c.scope === "gc") { scope.gc.push(a); placed = true; break; }
    }
    if (placed) continue;
    // no in-scope highlight — bucket by first highlight's classification
    const c0 = classify((a.highlights ?? [])[0]?.uri);
    if (c0.scope === "out") scope.out.set(c0.top, (scope.out.get(c0.top) ?? 0) + 1);
    else if (c0.scope === "uncategorised") scope.uncategorised.push({ a, reason: c0.reason, uri: c0.uri });
    else scope.out.set("(other)", (scope.out.get("(other)") ?? 0) + 1);
  }

  // ---- 2. assemble scripture -------------------------------------------------
  const content = new ContentClient(resolve(ROOT, "data/cache/content"), "eng", 350);
  const allDiags: Diag[] = [];
  const allTags: TagEntry[] = [];
  const allUnplacedNotes: UnplacedNote[] = [];
  const parts: DocPart[] = [];

  for (const pdef of SCRIPTURE_PARTS) {
    const books: { spec: any; result: BookResult }[] = [];
    for (const [k, anns] of scope.scripture) {
      const meta = bookMeta.get(k)!;
      if (meta.partKey !== pdef.key) continue;
      // need a display name — peek at the first chapter's fetched title
      const firstCh = Math.min(...anns.flatMap((a) => (a.highlights ?? []).map((h) => {
        const m = (h.uri ?? "").match(new RegExp(`/${meta.slug}/(\\d+)`));
        return m ? Number(m[1]) : Infinity;
      })));
      const peek = Number.isFinite(firstCh) ? await content.tryGet(`${meta.base}/${meta.slug}/${firstCh}`) : null;
      const spec = {
        slug: meta.slug,
        name: bookName(meta.collection, meta.slug, peek?.meta.title),
        abbrev: abbrev(meta.collection, meta.slug),
        base: meta.base,
        order: meta.order,
        partKey: pdef.key,
        chapterWord: chapterWord(meta.collection, meta.slug),
      };
      const result = await assembleScriptureBook(anns, spec, content);
      books.push({ spec, result });
      allDiags.push(...result.diags);
      allTags.push(...result.tagEntries);
      allUnplacedNotes.push(...result.unplacedNotes);
      process.stdout.write(`  ${spec.name}: ${result.chapters.length} ch, ${result.diags.length} diag rows\r`);
    }
    const part = buildScripturePart(pdef.key, pdef.title, books);
    if (part.kind === "scripture" && part.chapters.length) {
      parts.push(part);
      console.log(`\n[${pdef.title}] ${new Set(part.chapters.map((c) => c.book)).size} books, ${part.chapters.length} chapters`);
    } else if (books.length) {
      console.log(`\n[${pdef.title}] ${books.length} books but 0 renderable chapters — dropped`);
    }
  }

  // ---- 3. assemble GC -----------------------------------------------------
  const confs = [...new Set(scope.gc.flatMap((a) =>
    (a.highlights ?? []).map((h) => (h.uri ?? "").match(/\/general-conference\/(\d{4})\/(\d{2})\//)).filter(Boolean)
      .map((m) => `${m![1]}-${m![2]}`),
  ))].sort().map((s) => ({ year: s.slice(0, 4), month: s.slice(5) }));
  console.log(`\n[General Conference] ${confs.length} conferences`);
  const gc = await assembleConferencePart(scope.gc, confs, content);
  parts.push(gc.part);
  allTags.push(...gc.tagEntries);
  allDiags.push(...gc.diags);
  allUnplacedNotes.push(...gc.unplacedNotes);

  // ---- 3b. notebooks ------------------------------------------------------
  console.log(`\n[Notebooks]`);
  const nb = await assembleNotebooksPart(all, content);
  if (nb.part.kind === "notebooks" && nb.part.notebooks.length) {
    parts.push(nb.part);
    allDiags.push(...nb.diags);
    console.log(`  ${nb.part.notebooks.length} notebooks`);
  }

  const assembleMs = Date.now() - t0;

  // ---- 4. build the doc-model ------------------------------------------------
  const partOrder = (p: DocPart) =>
    SCRIPTURE_PARTS.find((sp) => sp.key === p.key)?.order ??
    (p.kind === "gc" ? 90 : p.kind === "notebooks" ? 95 : 99);
  parts.sort((a, b) => partOrder(a) - partOrder(b));
  const dates = all.map((a) => a.created).filter(Boolean).sort();
  const tagCount = new Map<string, number>();
  let noteCount = 0;
  for (const a of all) {
    if (a.note?.content) noteCount++;
    for (const t of a.tags) tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
  }
  const book: DocBook = {
    generatedAt: new Date().toISOString(),
    personName: null,
    title: "The Marked Scriptures",
    margins: "fixed",
    parts,
    tagIndex: mergeTagIndex(allTags),
    unplacedNotes: allUnplacedNotes.map((n) => ({
      source: n.source, created: n.created, title: n.title, body: n.body, tags: n.tags,
    })),
    stats: {
      dateRange: [dates[0] ?? "", dates.at(-1) ?? ""],
      versesMarked: new Set(all.flatMap((a) => (a.highlights ?? []).map((h) => h.uri))).size,
      notesWritten: noteCount,
      tagsUsed: tagCount.size,
      topTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    },
  };

  // ---- 5. aggregate diagnostics ------------------------------------------------
  const inScopeCount = [...scope.scripture.values()].reduce((s, a) => s + a.length, 0) + scope.gc.length;
  const outCount = [...scope.out.values()].reduce((s, n) => s + n, 0);

  const byCat = new Map<string, number>();
  const byCatYear = new Map<string, Map<string, number>>();
  const noteLens: number[] = [];
  const featureCount = new Map<string, number>();
  for (const d of allDiags) {
    byCat.set(d.category, (byCat.get(d.category) ?? 0) + 1);
    const y = yearOf(d.created);
    const m = byCatYear.get(d.category) ?? new Map();
    m.set(y, (m.get(y) ?? 0) + 1);
    byCatYear.set(d.category, m);
    if (d.noteChars) noteLens.push(d.noteChars);
    for (const f of d.noteFeatures ?? []) featureCount.set(f, (featureCount.get(f) ?? 0) + 1);
  }
  noteLens.sort((a, b) => a - b);
  const q = (p: number) => noteLens[Math.floor(noteLens.length * p)] ?? 0;

  const failCats: string[] = FAIL_CATEGORIES;
  const warnCats: string[] = WARN_CATEGORIES;
  const okCats: string[] = OK_CATEGORIES;
  const sum = (cats: string[]) => cats.reduce((s, c) => s + (byCat.get(c) ?? 0), 0);

  const L: string[] = [];
  L.push("FULL-CORPUS VALIDATION REPORT");
  L.push(`generated ${new Date().toISOString()}`);
  L.push("=".repeat(72), "");
  L.push("EXPORT");
  L.push(`  envelope version            ${exportFile.version}`);
  L.push(`  exportedAt                  ${exportFile.exportedAt}`);
  L.push(`  source                      ${JSON.stringify(exportFile.source)}`);
  L.push("");
  L.push("SCOPE");
  L.push(`  total annotations           ${all.length}`);
  L.push(`  in scope (scripture + GC)   ${inScopeCount}   (${pct(inScopeCount, all.length)})`);
  L.push(`    scripture                 ${inScopeCount - scope.gc.length}`);
  L.push(`    general conference        ${scope.gc.length}`);
  L.push(`  study notebook (journal)    ${scope.studyNotebook.length}`);
  L.push(`  out of current scope        ${outCount}`);
  for (const [s, n] of [...scope.out.entries()].sort((a, b) => b[1] - a[1])) L.push(`    ${s.padEnd(22)} ${n}`);
  L.push(`  uncategorised               ${scope.uncategorised.length}`);
  const uncReasons = new Map<string, number>();
  for (const u of scope.uncategorised) uncReasons.set(u.reason, (uncReasons.get(u.reason) ?? 0) + 1);
  for (const [r, n] of uncReasons) L.push(`    ${r.padEnd(50)} ${n}`);
  L.push("");

  L.push("RECONSTRUCTION (of the in-scope highlights, by diagnostic row)");
  const totalRows = allDiags.length;
  L.push(`  diagnostic rows             ${totalRows}`);
  L.push(`  clean  (located + clear)    ${sum(okCats)}   (${pct(sum(okCats), totalRows)})`);
  L.push(`  warnings (whole-unit)       ${sum(warnCats)}   (${pct(sum(warnCats), totalRows)})`);
  L.push(`  failures                    ${sum(failCats)}   (${pct(sum(failCats), totalRows)})`);
  L.push("");
  L.push("  by category:");
  for (const [c, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) L.push(`    ${c.padEnd(22)} ${n}`);
  L.push("");

  L.push("FAILURES / WARNINGS BY ANNOTATION YEAR  (does legacy data degrade?)");
  const years = [...new Set(allDiags.map((d) => yearOf(d.created)))].sort();
  L.push(`  year   ` + [...warnCats, ...failCats].map((c) => c.slice(0, 10).padStart(11)).join(""));
  for (const y of years) {
    const row = [...warnCats, ...failCats].map((c) => String(byCatYear.get(c)?.get(y) ?? 0).padStart(11)).join("");
    L.push(`  ${y}${row}`);
  }
  L.push("");

  L.push("NOTES");
  L.push(`  notes measured             ${noteLens.length}`);
  L.push(`  length chars  min ${noteLens[0] ?? 0}  p50 ${q(0.5)}  p90 ${q(0.9)}  p99 ${q(0.99)}  max ${noteLens.at(-1) ?? 0}`);
  L.push(`  feature counts:`);
  for (const [f, n] of [...featureCount.entries()].sort((a, b) => b[1] - a[1])) L.push(`    ${f.padEnd(12)} ${n}`);
  L.push("");

  L.push("CONTENT FETCH");
  L.push(`  cache hits                 ${content.cacheHits}`);
  L.push(`  fetched this run           ${content.fetched}`);
  L.push(`  fetch failures             ${content.failures.size}`);
  for (const [u, why] of [...content.failures].slice(0, 40)) L.push(`    ${u}  — ${why}`);
  L.push("");

  L.push("DOC MODEL");
  const scrChapters = parts.filter((p) => p.kind === "scripture").reduce((s, p: any) => s + p.chapters.length, 0);
  const gcTalks = parts.filter((p) => p.kind === "gc").reduce((s, p: any) => s + p.conferences.reduce((x: number, c: any) => x + c.talks.length, 0), 0);
  L.push(`  parts                      ${parts.length}  (${parts.map((p) => p.title).join(", ")})`);
  L.push(`  scripture chapters         ${scrChapters}`);
  L.push(`  gc talks                   ${gcTalks}`);
  L.push(`  tag index entries          ${book.tagIndex.length}`);
  L.push(`  unplaced notes preserved   ${allUnplacedNotes.length}`);
  L.push(`  multi-note units (approx)  ${allDiags.filter((d) => d.category === "located" && d.noteChars !== undefined).length}`);
  L.push(`  assemble time              ${(assembleMs / 1000).toFixed(1)} s`);
  L.push("");

  // full diagnostic dump (failures + warnings only) for manual inspection
  const dump = allDiags
    .filter((d) => failCats.includes(d.category) || warnCats.includes(d.category))
    .map((d) => `${d.created}  ${d.category.padEnd(20)} ${d.unitRef}  ${d.detail ?? ""}`);
  writeFileSync(resolve(OUT, "failures.txt"), dump.join("\n") + "\n");
  L.push(`(${dump.length} failure/warning rows dumped to out/validate/failures.txt)`);

  // ---- 6. optional render ----------------------------------------------------
  if (RENDER) {
    L.push("", "RENDER");
    const rt0 = Date.now();
    const memBefore = process.memoryUsage().rss;
    try {
      const { pdf } = renderPdf({ book, projectRoot: ROOT, template: "templates/book.typ", outPdf: "out/validate/full.pdf" });
      const { statSync } = await import("node:fs");
      const bytes = statSync(pdf).size;
      L.push(`  typeset time               ${((Date.now() - rt0) / 1000).toFixed(1)} s`);
      L.push(`  pdf size                   ${(bytes / 1e6).toFixed(1)} MB`);
      L.push(`  node rss delta             ${((process.memoryUsage().rss - memBefore) / 1e6).toFixed(0)} MB (typst runs as a subprocess — see its own peak separately)`);
      L.push(`  pdf                        ${pdf}`);
    } catch (e) {
      L.push(`  RENDER FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const report = L.join("\n") + "\n";
  writeFileSync(resolve(OUT, "report.txt"), report);
  console.log("\n" + report);
  writeFileSync(resolve(OUT, "doc-model.json"), JSON.stringify(book));
}

main().catch((e) => { console.error(e); process.exit(1); });
