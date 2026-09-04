// Shared: map a set of annotations onto parsed units (scripture verses or talk
// paragraphs) and produce render-ready DocVerse[] plus tag references.
import { locate } from "./locate.js";
import { parseNote } from "./noteHtml.js";
import { segment } from "./segment.js";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const style = (h) => (h.style ? "underline" : "fill");
export function assembleUnits(units, anns, opts) {
    const byAid = new Map(units.map((u) => [u.aid, u]));
    const byVid = new Map(units.map((u) => [u.vid, u]));
    const marksByRef = new Map();
    const notesByRef = new Map();
    const tagRefs = [];
    const located = [];
    const noMatch = [];
    const diags = [];
    const unplacedNotes = [];
    const noteFeatures = (html, body) => {
        const f = [];
        if (!html)
            return f;
        if (/<a\s/i.test(html))
            f.push("link");
        if (/<(ul|ol)\b/i.test(html))
            f.push("list");
        if (/<blockquote\b/i.test(html))
            f.push("quote");
        if (/<(b|strong)\b/i.test(html))
            f.push("bold");
        if (/<(i|em)\b/i.test(html))
            f.push("italic");
        if (body.length > 1)
            f.push("multiblock");
        return f;
    };
    for (const a of anns) {
        const created = (a.created ?? "").slice(0, 10);
        const hs = (a.highlights ?? []).filter(opts.inScope);
        const spanRefs = [];
        const spanUnits = [];
        for (const h of hs) {
            const u = byAid.get(h.pid) ??
                byVid.get((h.uri ?? "").match(/\.(p[\w-]+)(?:[?]|$)/)?.[1] ?? "");
            if (!u) {
                noMatch.push(`${opts.label}: ${h.uri}`);
                diags.push({ annotationId: a.annotationId, created, unitRef: h.pid, category: "pid-no-match", detail: h.uri });
                continue;
            }
            spanRefs.push(u.ref);
            if (h.color === "clear") {
                located.push({ ref: `${opts.label} ${u.ref}`, color: "clear", style: "-", offsets: "-", status: "no visual mark", sample: "" });
                spanUnits.push({ u, h, loc: { start: 0, end: 0, substring: "", ok: true } });
                diags.push({ annotationId: a.annotationId, created, unitRef: u.ref, category: "clear" });
                continue;
            }
            const loc = locate(u.text, h.startOffset, h.endOffset);
            marksByRef.set(u.ref, [
                ...(marksByRef.get(u.ref) ?? []),
                { start: loc.start, end: loc.end, color: h.color, style: style(h), substring: loc.substring },
            ]);
            spanUnits.push({ u, h, loc });
            located.push({
                ref: `${opts.label} ${u.ref}`, color: h.color, style: style(h),
                offsets: `${h.startOffset},${h.endOffset}`,
                status: loc.ok ? "OK" : `FALLBACK: ${loc.reason}`,
                sample: loc.substring.slice(0, 60),
            });
            let cat = "located";
            if (!loc.ok)
                cat = (loc.reason ?? "").startsWith("empty span") ? "empty-span" : "whole-unit-fallback";
            diags.push({ annotationId: a.annotationId, created, unitRef: u.ref, category: cat, detail: loc.ok ? undefined : loc.reason });
        }
        const hasText = !!(a.note?.content || a.note?.title);
        if (!hasText && a.tags.length === 0)
            continue;
        const anchorRef = spanRefs[0];
        if (!anchorRef) {
            diags.push({ annotationId: a.annotationId, created, unitRef: "-", category: "note-no-anchor",
                detail: (a.highlights ?? []).map((h) => h.uri).join(",") });
            const body = parseNote(a.note?.content);
            if (body.length > 0 || a.note?.title || a.tags.length > 0) {
                unplacedNotes.push({
                    annotationId: a.annotationId, created, source: opts.label,
                    title: a.note?.title ?? null, body, tags: a.tags.map((t) => t.name),
                });
            }
            continue;
        }
        const first = spanUnits[0];
        const mark = first && first.h.color !== "clear"
            ? { color: first.h.color, style: style(first.h) }
            : null;
        const refLabel = spanRefs.length > 1 ? opts.rangeLabel(spanRefs) : opts.unitLabel(spanRefs[0]);
        const body = parseNote(a.note?.content);
        const emptyNote = a.note?.content && body.length === 0;
        if (emptyNote) {
            diags.push({ annotationId: a.annotationId, created, unitRef: anchorRef, category: "note-parse-empty" });
        }
        // a whitespace-only note with no title and no tags contributes nothing — skip it
        if (emptyNote && !a.note?.title && a.tags.length === 0)
            continue;
        if (hasText || a.tags.length) {
            diags.push({
                annotationId: a.annotationId, created, unitRef: anchorRef, category: "located",
                noteChars: a.note?.content ? a.note.content.replace(/<[^>]+>/g, "").length : 0,
                noteFeatures: noteFeatures(a.note?.content, body),
            });
        }
        notesByRef.set(anchorRef, [
            ...(notesByRef.get(anchorRef) ?? []),
            {
                refLabel, mark,
                isReference: a.type === "reference",
                title: a.note?.title ?? null,
                body,
                tags: a.tags.map((t) => t.name),
                created,
                spanRefs,
                _spanStart: first?.loc.start ?? 0,
            },
        ]);
        for (const t of a.tags)
            tagRefs.push({ tag: t.name, ref: anchorRef });
    }
    // per-unit: order notes by span position; a/b letters when >1
    for (const [ref, notes] of notesByRef) {
        notes.sort((x, y) => x._spanStart - y._spanStart);
        if (notes.length > 1) {
            notes.forEach((n, i) => (n.letter = LETTERS[i]));
            const marks = marksByRef.get(ref) ?? [];
            for (const n of notes) {
                const m = marks.find((mk) => mk.start === n._spanStart && !mk.letter);
                if (m)
                    m.letter = n.letter;
            }
        }
        for (const n of notes)
            delete n._spanStart;
    }
    const shownRefs = new Set([...marksByRef.keys(), ...notesByRef.keys()]);
    const shown = units.filter((u) => shownRefs.has(u.ref)).sort((a, b) => a.num - b.num);
    const docVerses = [];
    let prev = null;
    for (const u of shown) {
        const vmarks = (marksByRef.get(u.ref) ?? []).sort((a, b) => a.start - b.start);
        docVerses.push({
            ref: u.ref, num: u.num,
            runs: segment(u.text, vmarks, u.styles),
            marks: vmarks,
            notes: notesByRef.get(u.ref) ?? [],
            gapBefore: prev !== null && u.num - prev > 1,
        });
        prev = u.num;
    }
    const multiNoteUnits = [...notesByRef.values()].filter((ns) => ns.length > 1).length;
    return { docVerses, tagRefs, located, noMatch, diags, unplacedNotes, multiNoteUnits };
}
