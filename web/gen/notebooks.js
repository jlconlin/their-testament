import { classify, abbrev } from "./scripture.js";
import { parseVerses } from "./verses.js";
import { parseTalk } from "./talk.js";
import { parseNote } from "./noteHtml.js";
import { locate } from "./locate.js";
import { segment } from "./segment.js";
/**
 * Resolve the units a notebook entry's highlights point to, and render them
 * (unlike the main pipeline, a `clear` highlight still surfaces the verse — in
 * a collection the highlight *is* the content).
 */
function passageVerses(a, units, docUri, leadingTokens = 0) {
    const byAid = new Map(units.map((u) => [u.aid, u]));
    const byVid = new Map(units.map((u) => [u.vid, u]));
    const marksByRef = new Map();
    const touched = new Map();
    for (const h of a.highlights ?? []) {
        if (!(h.uri ?? "").includes(docUri))
            continue;
        const u = byAid.get(h.pid) ?? byVid.get((h.uri ?? "").match(/\.(p[\w-]+)(?:$|[?#])/)?.[1] ?? "");
        if (!u)
            continue;
        touched.set(u.ref, u);
        if (h.color !== "clear") {
            const loc = locate(u.text, h.startOffset, h.endOffset, leadingTokens);
            marksByRef.set(u.ref, [
                ...(marksByRef.get(u.ref) ?? []),
                { start: loc.start, end: loc.end, color: h.color, style: h.style ? "underline" : "fill", substring: loc.substring },
            ]);
        }
    }
    const note = a.note?.content || a.note?.title
        ? [{
                refLabel: "", mark: null, isReference: a.type === "reference",
                title: a.note?.title ?? null, body: parseNote(a.note?.content),
                tags: a.tags.map((t) => t.name), created: (a.created ?? "").slice(0, 10), spanRefs: [],
            }]
        : [];
    const ordered = [...touched.values()].sort((x, y) => x.num - y.num);
    const out = [];
    let prev = null;
    for (const u of ordered) {
        const vmarks = (marksByRef.get(u.ref) ?? []).sort((m1, m2) => m1.start - m2.start);
        out.push({
            ref: u.ref, num: u.num,
            runs: segment(u.text, vmarks, u.styles),
            marks: vmarks,
            notes: out.length === 0 ? note : [],
            gapBefore: prev !== null && u.num - prev > 1,
        });
        prev = u.num;
    }
    return out;
}
/** A text entry that reads as a notebook description rather than a note. */
function isDescription(a, index) {
    return index === 0 && !a.note?.title;
}
function passageMeta(a) {
    const h = (a.highlights ?? [])[0];
    if (!h)
        return null;
    const c = classify(h.uri);
    if (c.scope === "scripture") {
        return { docUri: c.docUri, kind: "scripture", bookAbbrev: abbrev(c.collection, c.bookSlug), chapter: c.chapter };
    }
    if (c.scope === "gc")
        return { docUri: c.docUri, kind: "gc" };
    return { docUri: (h.uri ?? "").replace(/\.[^/]*$/, ""), kind: "other" };
}
export async function assembleNotebooksPart(annotations, content, partKey = "notebooks", partTitle = "Notebooks") {
    const byId = new Map(annotations.map((a) => [a.annotationId, a]));
    const diags = [];
    // collect folders (dedupe by id; keep the longest orderedAnnotationIds seen)
    const folders = new Map();
    for (const a of annotations) {
        for (const f of a.folders ?? []) {
            const raw = f;
            const existing = folders.get(raw.folderId);
            if (!existing || (raw.orderedAnnotationIds?.length ?? 0) > existing.orderedAnnotationIds.length) {
                folders.set(raw.folderId, {
                    folderId: raw.folderId,
                    name: raw.name,
                    orderedAnnotationIds: raw.orderedAnnotationIds ?? [],
                });
            }
        }
    }
    const notebooks = [];
    for (const folder of folders.values()) {
        const order = folder.orderedAnnotationIds.length
            ? folder.orderedAnnotationIds
            : annotations.filter((a) => (a.folders ?? []).some((f) => f.folderId === folder.folderId)).map((a) => a.annotationId);
        let description = null;
        const entries = [];
        for (const [i, id] of order.entries()) {
            const a = byId.get(id);
            if (!a)
                continue;
            const created = (a.created ?? "").slice(0, 10);
            // text entry
            if (!(a.highlights ?? []).length) {
                const body = parseNote(a.note?.content);
                if (isDescription(a, i) && body.length) {
                    description = body;
                }
                else if (body.length || a.note?.title) {
                    entries.push({ kind: "text", title: a.note?.title ?? null, body, created });
                }
                continue;
            }
            // passage entry
            const meta = passageMeta(a);
            if (!meta)
                continue;
            const bareRef = meta.bookAbbrev && meta.chapter ? `${meta.bookAbbrev} ${meta.chapter}` : (a.highlights[0].uri ?? "");
            const page = await content.tryGet(meta.docUri);
            if (!page) {
                entries.push({
                    kind: "citation", refLabel: bareRef,
                    note: a.note?.content ? parseNote(a.note.content).map(nodeText).join(" ") : null, created,
                });
                continue;
            }
            const talk = meta.kind === "scripture" ? null : parseTalk(page);
            const units = meta.kind === "scripture" ? parseVerses(page, meta.chapter) : talk.paragraphs;
            // scripture verses carry a leading number in the source; talks do not
            const docVerses = passageVerses(a, units, meta.docUri, meta.kind === "scripture" ? 1 : 0);
            if (docVerses.length === 0) {
                // highlight landed on a title / heading — render as a citation to the piece
                const cls = classify(a.highlights[0].uri);
                const src = cls.scope === "gc" ? `General Conference, ${monthYear(meta.docUri)}` :
                    /\/(ensign|liahona)\//.test(meta.docUri) ? italicSource(meta.docUri) :
                        /\/manual\//.test(meta.docUri) ? "Church manual" : "";
                const title = talk?.title ?? "";
                const who = talk?.speaker ?? "";
                entries.push({
                    kind: "citation",
                    refLabel: [title && `“${title}”`, who, src].filter(Boolean).join(" · "),
                    note: a.note?.content ? parseNote(a.note.content).map(nodeText).join(" ") : null,
                    created,
                });
                continue;
            }
            let refLabel;
            const nums = docVerses.map((v) => v.num);
            if (talk) {
                const who = `${talk.speaker.split(" ").filter(Boolean).at(-1)}, “${talk.title}”`;
                refLabel = `${who} ¶ ${Math.min(...nums)}${nums.length > 1 ? `–${Math.max(...nums)}` : ""}`;
            }
            else if (meta.bookAbbrev && meta.chapter) {
                refLabel = `${meta.bookAbbrev} ${meta.chapter}:${Math.min(...nums)}${nums.length > 1 ? `–${Math.max(...nums)}` : ""}`;
            }
            else {
                refLabel = bareRef;
            }
            entries.push({ kind: "passage", refLabel, verses: docVerses, created });
        }
        notebooks.push({ name: folder.name, description, entries });
    }
    // "Unsorted Notes" — loose journal entries in no folder
    const loose = annotations
        .filter((a) => a.type === "journal" && !(a.highlights ?? []).length && !(a.folders ?? []).length)
        .sort((x, y) => (x.created ?? "").localeCompare(y.created ?? ""));
    if (loose.length) {
        notebooks.push({
            name: "Unsorted Notes",
            description: null,
            entries: loose.map((a) => ({
                kind: "text",
                title: a.note?.title ?? null,
                body: parseNote(a.note?.content),
                created: (a.created ?? "").slice(0, 10),
            })),
        });
    }
    return { part: { kind: "notebooks", key: partKey, title: partTitle, notebooks }, diags };
}
function nodeText(n) {
    if (n.t === "text")
        return n.s;
    if (n.children)
        return n.children.map(nodeText).join("");
    if (n.items)
        return n.items.map((it) => it.map(nodeText).join("")).join(" ");
    return "";
}
const MONTHS = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
function monthYear(uri) {
    const m = uri.match(/\/(\d{4})\/(\d{2})\//);
    if (!m)
        return "";
    const mo = m[2] === "04" ? "April" : m[2] === "10" ? "October" : (MONTHS[Number(m[2])] ?? "");
    return `${mo} ${m[1]}`;
}
function italicSource(uri) {
    const m = uri.match(/\/(ensign|liahona)\/(\d{4})\/(\d{2})\//);
    if (!m)
        return "";
    const mag = m[1] === "ensign" ? "Ensign" : "Liahona";
    return `${mag}, ${MONTHS[Number(m[3])] ?? ""} ${m[2]}`;
}
