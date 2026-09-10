// Given a full annotation export, build the complete DocBook -- every marked
// book, conference, study-help entry, magazine article, manual lesson and
// notebook. Shared by the Node
// full-corpus validator (scripts/validate.ts) and the browser generator (M6);
// extracted from validate.ts's steps 1-4 so both have exactly one
// implementation of "how annotations become a book."
import { assembleScriptureBook, buildScripturePart, mergeTagIndex } from "./assemble.js";
import { assembleConferencePart } from "./assembleGC.js";
import { assembleNotebooksPart } from "./notebooks.js";
import { assembleCollectionPart } from "./assembleCollection.js";
import { classify, SCRIPTURE_PARTS, bookName, chapterWord, abbrev, titleFromSlug, HELPS_PART, MAGAZINES_PART, MANUALS_PART, HELP_COLLECTIONS, HELP_ORDER, MAGAZINE_ORDER, } from "./scripture.js";
export async function assembleBook(annotations, content, opts = {}) {
    // ---- 1. classify every annotation --------------------------------------
    const scope = {
        scripture: new Map(),
        gc: [],
        uncategorised: [],
    };
    // section key -> issue key (or "" when the section is flat) -> doc URIs
    const collections = {
        helps: new Map(),
        magazines: new Map(),
        manuals: new Map(),
    };
    const sectionLabel = new Map(); // section key -> display label
    const noteDoc = (where, section, issue, docUri) => {
        const sec = where.get(section) ?? new Map();
        const iss = sec.get(issue) ?? new Set();
        iss.add(docUri);
        sec.set(issue, iss);
        where.set(section, sec);
    };
    const bookMeta = new Map();
    const outBySource = new Map();
    let outHighlights = 0;
    let outWithContent = 0;
    for (const a of annotations) {
        if (a.type === "journal" && !(a.highlights ?? []).length)
            continue; // notebooks handled separately, from all annotations
        let placed = false;
        for (const h of a.highlights ?? []) {
            const c = classify(h.uri);
            if (c.scope !== "out" && c.scope !== "uncategorised")
                continue;
            outHighlights++;
            const top = (h.uri ?? "").replace(/^\//, "").split("/")[0] || "(unknown)";
            outBySource.set(top, (outBySource.get(top) ?? 0) + 1);
        }
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
            if (c.scope === "help") {
                sectionLabel.set(c.collection, c.collectionTitle);
                noteDoc(collections.helps, c.collection, "", c.docUri);
                placed = true;
                break;
            }
            if (c.scope === "magazine") {
                sectionLabel.set(c.pub, c.pubTitle);
                noteDoc(collections.magazines, c.pub, `${c.year}-${c.month}`, c.docUri);
                placed = true;
                break;
            }
            if (c.scope === "manual") {
                noteDoc(collections.manuals, c.manual, "", c.docUri);
                placed = true;
                break;
            }
        }
        if (placed)
            continue;
        // nothing on this annotation landed in the book at all
        if ((a.highlights ?? []).length && (a.note?.content || a.note?.title || a.tags.length))
            outWithContent++;
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
    // ---- 3c. study helps, magazines, manuals -------------------------------
    // All three are articles with numbered paragraphs, so they share one
    // assembler; only the grouping differs (see assembleCollection.ts).
    const helpSections = [...collections.helps]
        .sort((a, b) => HELP_ORDER.indexOf(a[0]) - HELP_ORDER.indexOf(b[0]))
        .map(([key, issues]) => ({
        key,
        label: key === "proclamations" ? "Proclamations" : HELP_COLLECTIONS[key] ?? key,
        docs: [...(issues.get("") ?? [])].sort().map((uri) => ({
            slug: uri.split("/").pop(),
            uri,
            refPrefix: abbrevHelp(key),
        })),
    }));
    const magSections = [...collections.magazines]
        .sort((a, b) => magOrder(a[0]) - magOrder(b[0]) || a[0].localeCompare(b[0]))
        .map(([key, byIssue]) => ({
        key,
        label: sectionLabel.get(key) ?? key,
        issues: [...byIssue].sort((a, b) => a[0].localeCompare(b[0])).map(([ikey, uris]) => ({
            key: ikey,
            label: issueLabel(ikey),
            docs: [...uris].sort().map((uri) => ({
                // an article filed under an issue section has a two-segment slug;
                // flatten it so the doc key stays unique and stays one token
                slug: uri.split("/").slice(4).join("-"),
                uri,
                refPrefix: `${sectionLabel.get(key) ?? key} ${issueLabel(ikey)}`,
            })),
        })),
    }));
    const manualSections = [];
    for (const [slug, byIssue] of collections.manuals) {
        const index = await content.tryGet(`/manual/${slug}`);
        const label = manualTitle(index) ?? titleFromSlug(slug);
        const uris = [...(byIssue.get("") ?? [])];
        manualSections.push({
            key: slug,
            label,
            docs: orderByManifest(uris, index, `/manual/${slug}/`).map((uri) => ({
                slug: uri.slice(`/manual/${slug}/`.length).replace(/\//g, "-"),
                uri,
                refPrefix: label,
                titleFrom: "meta",
            })),
        });
    }
    manualSections.sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
    for (const [defn, sections] of [
        [HELPS_PART, helpSections],
        [MAGAZINES_PART, magSections],
        [MANUALS_PART, manualSections],
    ]) {
        if (!sections.length)
            continue;
        const res = await assembleCollectionPart(annotations, sections, content, defn.key, defn.title);
        if (res.part.kind === "collection" && res.part.sections.length) {
            parts.push(res.part);
            allTags.push(...res.tagEntries);
            allDiags.push(...res.diags);
            allUnplacedNotes.push(...res.unplacedNotes);
        }
    }
    // ---- 3b. notebooks ----------------------------------------------------
    const nb = await assembleNotebooksPart(annotations, content);
    if (nb.part.kind === "notebooks" && nb.part.notebooks.length) {
        parts.push(nb.part);
        allDiags.push(...nb.diags);
    }
    // ---- 4. build the doc-model ------------------------------------------------
    const COLLECTION_ORDER = {
        [HELPS_PART.key]: HELPS_PART.order,
        [MAGAZINES_PART.key]: MAGAZINES_PART.order,
        [MANUALS_PART.key]: MANUALS_PART.order,
    };
    const partOrder = (p) => SCRIPTURE_PARTS.find((sp) => sp.key === p.key)?.order ??
        COLLECTION_ORDER[p.key] ??
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
        title: opts.title?.trim() || "Scripture Markings",
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
    return {
        book,
        diags: allDiags,
        uncategorised: scope.uncategorised,
        outOfScope: {
            highlights: outHighlights,
            annotationsWithContent: outWithContent,
            bySource: [...outBySource].sort((x, y) => y[1] - x[1]),
        },
    };
}
// ---- collection helpers ----------------------------------------------------
const MONTH_NAME = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
/** "1971-11" -> "November 1971". */
function issueLabel(key) {
    const [y, m] = key.split("-");
    return `${MONTH_NAME[Number(m)] ?? m} ${y}`;
}
const HELP_ABBREV = {
    tg: "TG", bd: "BD", gs: "GS", index: "Index", "triple-index": "Index",
    proclamations: "Proclamation",
};
function abbrevHelp(key) {
    return HELP_ABBREV[key] ?? key;
}
/** Named magazines first, in MAGAZINE_ORDER; broadcasts and anything else after. */
function magOrder(key) {
    const i = MAGAZINE_ORDER.indexOf(key);
    return i >= 0 ? i : MAGAZINE_ORDER.length;
}
/** A manual's own title, from its index page. */
function manualTitle(index) {
    if (!index)
        return null;
    const h1 = index.content.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const text = h1 ? h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
    return text || index.meta.title || null;
}
/**
 * Put a manual's documents in the manual's own order.
 *
 * The index page lists them; without it (a few manuals 404 there) the URIs are
 * sorted, which is right for the numbered ones and harmless for the rest.
 */
function orderByManifest(uris, index, prefix) {
    if (!index)
        return [...uris].sort();
    const listed = [];
    const re = new RegExp(`/study(${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-z0-9-]+(?:/[a-z0-9-]+)*)\\?`, "g");
    for (const m of index.content.body.matchAll(re)) {
        if (!listed.includes(m[1]))
            listed.push(m[1]);
    }
    const rank = new Map(listed.map((u, i) => [u, i]));
    return [...uris].sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || a.localeCompare(b));
}
