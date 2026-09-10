import { parseTalk } from "./talk.js";
import { parseHeadingUnits } from "./verses.js";
import { assembleUnits, markHeadingUnits } from "./units.js";
import { parseNote } from "./noteHtml.js";
/**
 * A highlight belongs to this document when its URI is the document URI, or
 * the document URI followed by an anchor. A plain `startsWith` would let
 * `/ensign/2004/03/faith` swallow `/ensign/2004/03/faith-unshaken`.
 */
function inDoc(uri) {
    const re = new RegExp(`^${uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[.?#]|$)`);
    return (h) => re.test(h.uri ?? "");
}
export async function assembleCollectionPart(annotations, sections, content, partKey, partTitle) {
    const tagEntries = [];
    const diags = [];
    const unplacedNotes = [];
    const out = [];
    let order = 0; // document ordinal across the whole Part, for the tag-index sort
    for (const sec of sections) {
        const buildDocs = async (docs, keyPrefix) => {
            const talks = [];
            for (const d of docs) {
                const touching = annotations.filter((a) => (a.highlights ?? []).some(inDoc(d.uri)));
                if (touching.length === 0)
                    continue;
                const page = await content.tryGet(d.uri);
                if (!page) {
                    // Retired manuals and withdrawn articles really do disappear from
                    // churchofjesuschrist.org. The passage cannot be reproduced, but
                    // whatever the reader wrote about it is theirs and is kept.
                    for (const a of touching) {
                        diags.push({
                            annotationId: a.annotationId, created: (a.created ?? "").slice(0, 10),
                            unitRef: d.uri, category: "source-unavailable",
                            detail: "no longer published on churchofjesuschrist.org",
                        });
                        const body = parseNote(a.note?.content);
                        if (body.length > 0 || a.note?.title || a.tags.length > 0) {
                            unplacedNotes.push({
                                annotationId: a.annotationId,
                                created: (a.created ?? "").slice(0, 10),
                                source: `${d.refPrefix} — ${d.slug.replace(/-/g, " ")}`,
                                title: a.note?.title ?? null,
                                body,
                                tags: a.tags.map((t) => t.name),
                            });
                        }
                    }
                    continue;
                }
                const parsed = parseTalk(page);
                if (d.titleFrom === "meta" && page.meta.title)
                    parsed.title = page.meta.title;
                const dkey = `${keyPrefix}|${d.slug}`;
                const headingMarks = markHeadingUnits(parseHeadingUnits(page), touching);
                const res = assembleUnits(parsed.paragraphs, touching, {
                    furniturePids: new Set(parsed.furniturePids),
                    inScope: inDoc(d.uri),
                    label: parsed.title,
                    rangeLabel: (refs) => `¶ ${paraNum(parsed, refs[0])}–${paraNum(parsed, refs.at(-1))}`,
                    unitLabel: (ref) => `¶ ${paraNum(parsed, ref)}`,
                });
                unplacedNotes.push(...res.unplacedNotes);
                order += 1;
                for (const dg of res.diags)
                    diags.push({ ...dg, unitRef: `${d.refPrefix}/${dg.unitRef}` });
                for (const { tag, ref } of res.tagRefs) {
                    tagEntries.push({
                        tag,
                        label: `${d.refPrefix}, ${shortTitle(parsed.title)}`,
                        key: `${dkey}|${ref}`,
                        showPage: true,
                        sort: [2000 + order, paraNum(parsed, ref), 0],
                    });
                }
                if (res.docVerses.length > 0 || res.chapterNotes.length > 0) {
                    talks.push({
                        slug: d.slug,
                        title: parsed.title,
                        speaker: parsed.speaker,
                        role: parsed.role,
                        paragraphs: res.docVerses,
                        chapterNotes: res.chapterNotes.length ? res.chapterNotes : undefined,
                        headingMarks: headingMarks.length ? headingMarks : undefined,
                    });
                }
            }
            return talks;
        };
        if (sec.issues) {
            const issues = [];
            for (const iss of sec.issues) {
                const talks = await buildDocs(iss.docs, `${partKey}|${sec.key}|${iss.key}`);
                if (talks.length)
                    issues.push({ key: iss.key, label: iss.label, talks });
            }
            if (issues.length)
                out.push({ key: sec.key, label: sec.label, issues });
        }
        else {
            const entries = await buildDocs(sec.docs ?? [], `${partKey}|${sec.key}`);
            if (entries.length)
                out.push({ key: sec.key, label: sec.label, entries });
        }
    }
    return {
        part: { kind: "collection", key: partKey, title: partTitle, sections: out },
        tagEntries,
        diags,
        unplacedNotes,
    };
}
/** Enough of a title to recognize it in the tag index without eating the line. */
function shortTitle(title) {
    const t = title.trim();
    return t.length <= 34 ? t : `${t.slice(0, 33).replace(/[\s,;:]+\S*$/, "")}…`;
}
function paraNum(parsed, ref) {
    return parsed.paragraphs.find((p) => p.ref === ref)?.num ?? 0;
}
