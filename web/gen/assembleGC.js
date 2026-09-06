import { parseTalk } from "./talk.js";
import { assembleUnits } from "./units.js";
const MONTHS = { "04": "April", "10": "October" };
function talkOrder(confBody) {
    const slugs = confBody.match(/\/general-conference\/\d{4}\/\d{2}\/([a-z0-9-]+)/g) ?? [];
    const seen = [];
    for (const s of slugs) {
        const slug = s.split("/").pop();
        if (!seen.includes(slug))
            seen.push(slug);
    }
    return seen;
}
export async function assembleConferencePart(annotations, years, content, partKey = "gc", partTitle = "General Conference") {
    const conferences = [];
    const tagEntries = [];
    const located = [];
    const noMatch = [];
    const diags = [];
    const unplacedNotes = [];
    let order = 0;
    for (const { year, month } of years) {
        const confPrefix = `/general-conference/${year}/${month}/`;
        const inConf = (h) => (h.uri ?? "").startsWith(confPrefix);
        // talk slug -> annotations touching it
        const byTalk = new Map();
        for (const a of annotations) {
            const slugs = new Set();
            for (const h of a.highlights ?? []) {
                const m = (h.uri ?? "").match(new RegExp(`${confPrefix}([a-z0-9-]+)`));
                if (m)
                    slugs.add(m[1]);
            }
            for (const s of slugs) {
                byTalk.set(s, [...(byTalk.get(s) ?? []), a]);
            }
        }
        if (byTalk.size === 0)
            continue;
        const confPage = await content.tryGet(`/general-conference/${year}/${month}`);
        const ordered = confPage ? talkOrder(confPage.content.body).filter((s) => byTalk.has(s)) : [];
        // any annotated talks not in the TOC list (session pages etc.) — append
        for (const s of byTalk.keys())
            if (!ordered.includes(s))
                ordered.push(s);
        const talks = [];
        for (const slug of ordered) {
            const page = await content.tryGet(`${confPrefix}${slug}`);
            if (!page) {
                for (const a of byTalk.get(slug)) {
                    diags.push({
                        annotationId: a.annotationId, created: (a.created ?? "").slice(0, 10),
                        unitRef: `${year}-${month}/${slug}`, category: "pid-no-match", detail: "content fetch failed",
                    });
                }
                continue;
            }
            const parsed = parseTalk(page);
            const talkKey = `${partKey}|${year}-${month}|${slug}`; // must match template tkey (conf.key = "YYYY-MM")
            const res = assembleUnits(parsed.paragraphs, byTalk.get(slug), {
                inScope: (h) => inConf(h) && (h.uri ?? "").includes(`/${slug}`),
                label: `${parsed.title}`,
                rangeLabel: (refs) => `¶ ${paraNum(parsed, refs[0])}–${paraNum(parsed, refs.at(-1))}`,
                unitLabel: (ref) => `¶ ${paraNum(parsed, ref)}`,
            });
            located.push(...res.located.map((r) => `${r.ref.padEnd(40)} ${r.color}/${r.style} ${r.offsets} ${r.status}`));
            noMatch.push(...res.noMatch);
            unplacedNotes.push(...res.unplacedNotes);
            order += 1;
            const confAbbr = month === "04" ? "A" : month === "10" ? "O" : month;
            const yy = year.slice(2);
            const surname = parsed.speaker.split(" ").filter(Boolean).at(-1) ?? parsed.speaker;
            for (const d of res.diags) {
                diags.push({ ...d, unitRef: `${confAbbr}${yy}/${surname}/${d.unitRef}` });
            }
            for (const { tag, ref } of res.tagRefs) {
                tagEntries.push({
                    tag,
                    // "A-15, Bednar" — the template appends ", p. N" (part-relative page)
                    label: `${confAbbr}-${yy}, ${surname}`,
                    key: `${talkKey}|${ref}`,
                    showPage: true,
                    sort: [1000 + order, paraNum(parsed, ref), 0],
                });
            }
            // Same as scripture: a talk whose only annotation was a note on its
            // title still belongs in the book, or the note vanishes with it.
            if (res.docVerses.length > 0 || res.chapterNotes.length > 0) {
                talks.push({
                    slug,
                    title: parsed.title,
                    speaker: parsed.speaker,
                    role: parsed.role,
                    paragraphs: res.docVerses,
                    chapterNotes: res.chapterNotes.length ? res.chapterNotes : undefined,
                });
            }
        }
        conferences.push({
            key: `${year}-${month}`,
            label: `${MONTHS[month] ?? month} ${year}`,
            talks,
        });
    }
    return {
        part: { kind: "gc", key: partKey, title: partTitle, conferences },
        tagEntries,
        located,
        noMatch,
        diags,
        unplacedNotes,
    };
}
function paraNum(parsed, ref) {
    return parsed.paragraphs.find((p) => p.ref === ref)?.num ?? 0;
}
