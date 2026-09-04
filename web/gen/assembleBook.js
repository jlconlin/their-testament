// Given a full annotation export, build the complete DocBook -- every marked
// book, every marked GC conference, every notebook. Shared by the Node
// full-corpus validator (scripts/validate.ts) and the browser generator (M6);
// extracted from validate.ts's steps 1-4 so both have exactly one
// implementation of "how annotations become a book."
import { assembleScriptureBook, buildScripturePart, mergeTagIndex } from "./assemble.js";
import { assembleConferencePart } from "./assembleGC.js";
import { assembleNotebooksPart } from "./notebooks.js";
import { classify, SCRIPTURE_PARTS, bookName, chapterWord, abbrev } from "./scripture.js";
export async function assembleBook(annotations, content, opts = {}) {
    // ---- 1. classify every annotation --------------------------------------
    const scope = {
        scripture: new Map(),
        gc: [],
        uncategorised: [],
    };
    const bookMeta = new Map();
    for (const a of annotations) {
        if (a.type === "journal" && !(a.highlights ?? []).length)
            continue; // notebooks handled separately, from all annotations
        let placed = false;
        for (const h of a.highlights ?? []) {
            const c = classify(h.uri);
            if (c.scope === "scripture") {
                const k = `${c.partKey}|${c.bookSlug}`;
                scope.scripture.set(k, [...(scope.scripture.get(k) ?? []), a]);
                bookMeta.set(k, { collection: c.collection, slug: c.bookSlug, order: c.bookOrder, partKey: c.partKey, base: `/scriptures/${c.collection}` });
                placed = true;
                break;
            }
            if (c.scope === "gc") {
                scope.gc.push(a);
                placed = true;
                break;
            }
        }
        if (placed)
            continue;
        const c0 = classify((a.highlights ?? [])[0]?.uri);
        if (c0.scope === "uncategorised") {
            scope.uncategorised.push({ annotation: a, reason: c0.reason, uri: c0.uri });
        }
    }
    // ---- 2. assemble scripture ----------------------------------------------
    const allDiags = [];
    const allTags = [];
    const allUnplacedNotes = [];
    const parts = [];
    for (const pdef of SCRIPTURE_PARTS) {
        const books = [];
        for (const [k, anns] of scope.scripture) {
            const meta = bookMeta.get(k);
            if (meta.partKey !== pdef.key)
                continue;
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
        }
        const part = buildScripturePart(pdef.key, pdef.title, books);
        if (part.kind === "scripture" && part.chapters.length)
            parts.push(part);
    }
    // ---- 3. assemble GC -------------------------------------------------------
    const confs = [...new Set(scope.gc.flatMap((a) => (a.highlights ?? []).map((h) => (h.uri ?? "").match(/\/general-conference\/(\d{4})\/(\d{2})\//)).filter(Boolean)
            .map((m) => `${m[1]}-${m[2]}`)))].sort().map((s) => ({ year: s.slice(0, 4), month: s.slice(5) }));
    if (confs.length) {
        const gc = await assembleConferencePart(scope.gc, confs, content);
        parts.push(gc.part);
        allTags.push(...gc.tagEntries);
        allDiags.push(...gc.diags);
        allUnplacedNotes.push(...gc.unplacedNotes);
    }
    // ---- 3b. notebooks ----------------------------------------------------
    const nb = await assembleNotebooksPart(annotations, content);
    if (nb.part.kind === "notebooks" && nb.part.notebooks.length) {
        parts.push(nb.part);
        allDiags.push(...nb.diags);
    }
    // ---- 4. build the doc-model ------------------------------------------------
    const partOrder = (p) => SCRIPTURE_PARTS.find((sp) => sp.key === p.key)?.order ??
        (p.kind === "gc" ? 90 : p.kind === "notebooks" ? 95 : 99);
    parts.sort((a, b) => partOrder(a) - partOrder(b));
    const dates = annotations.map((a) => a.created).filter(Boolean).sort();
    const tagCount = new Map();
    let noteCount = 0;
    for (const a of annotations) {
        if (a.note?.content)
            noteCount++;
        for (const t of a.tags)
            tagCount.set(t.name, (tagCount.get(t.name) ?? 0) + 1);
    }
    const book = {
        generatedAt: new Date().toISOString(),
        personName: opts.personName ?? null,
        title: opts.title ?? "The Marked Scriptures",
        margins: opts.margins ?? "fixed",
        parts,
        tagIndex: mergeTagIndex(allTags),
        unplacedNotes: allUnplacedNotes.map((n) => ({
            source: n.source, created: n.created, title: n.title, body: n.body, tags: n.tags,
        })),
        stats: {
            dateRange: [dates[0] ?? "", dates.at(-1) ?? ""],
            versesMarked: new Set(annotations.flatMap((a) => (a.highlights ?? []).map((h) => h.uri))).size,
            notesWritten: noteCount,
            tagsUsed: tagCount.size,
            topTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
        },
    };
    return { book, diags: allDiags, uncategorised: scope.uncategorised };
}
