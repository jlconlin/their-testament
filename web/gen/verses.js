import { parse } from "node-html-parser";
/**
 * Parse a study-content `body` fragment into scripture verses.
 *
 * `text` is the reading text with the verse number and footnote-marker letters
 * removed and whitespace collapsed — the exact string the Gospel Library word
 * offsets index into (matches how the community exporter counts: strip <sup>
 * and .verse-number, take text, split on spaces).
 */
export function parseVerses(page, chapter) {
    const root = parse(page.content.body, { blockTextElements: {} });
    const verses = [];
    for (const p of root.querySelectorAll("p.verse")) {
        const vid = p.getAttribute("id") ?? "";
        const aid = p.getAttribute("data-aid") ?? "";
        const engRef = p.getAttribute("data-eng-ref"); // OT/NT only: "38:1"
        // verse number: from the .verse-number span (all standard works have it),
        // falling back to data-eng-ref or sequence.
        const vnSpan = p.querySelector(".verse-number")?.text ?? "";
        const vnMatch = vnSpan.match(/\d+/);
        const num = vnMatch
            ? Number(vnMatch[0])
            : engRef
                ? Number(engRef.split(":")[1])
                : verses.length + 1;
        // ref is always "chapter:verse" so anchoring/index keys are uniform across
        // OT/NT (which carry data-eng-ref) and BoM/D&C/PoGP (which don't).
        const ref = chapter != null ? `${chapter}:${num}` : engRef ?? `${num}`;
        const { text, styles } = extract(p);
        verses.push({ ref, vid, aid, num, text, styles });
    }
    return verses;
}
/** Reading text + inline style spans for a paragraph-ish element (verse or talk paragraph). */
export function extractText(p) {
    return extract(p);
}
function extract(p) {
    let raw = "";
    const styles = [];
    const walk = (node) => {
        // text node
        if (node.nodeType === 3) {
            raw += node.text ?? "";
            return;
        }
        const el = node;
        if (!el.tagName) {
            raw += el.text ?? "";
            return;
        }
        const tag = el.tagName.toLowerCase();
        const cls = new Set((el.getAttribute("class") ?? "").split(/\s+/));
        if (tag === "sup" ||
            cls.has("verse-number") ||
            cls.has("page-break") ||
            cls.has("para-mark")) {
            return;
        }
        let kind = null;
        if (cls.has("clarity-word"))
            kind = "italic";
        else if (cls.has("small-caps") || cls.has("deity-name"))
            kind = "small-caps";
        const start = raw.length;
        for (const child of el.childNodes)
            walk(child);
        if (kind && raw.length > start) {
            const span = [start, raw.length, kind];
            if (!styles.some((s) => s[0] === span[0] && s[1] === span[1] && s[2] === span[2])) {
                styles.push(span);
            }
        }
    };
    for (const child of p.childNodes)
        walk(child);
    // collapse whitespace, remapping style offsets
    const map = [];
    let collapsed = "";
    let prevSpace = false;
    for (let i = 0; i < raw.length; i++) {
        map[i] = collapsed.length;
        const ch = raw[i];
        if (/\s/.test(ch)) {
            if (prevSpace)
                continue;
            collapsed += " ";
            prevSpace = true;
        }
        else {
            collapsed += ch;
            prevSpace = false;
        }
    }
    map[raw.length] = collapsed.length;
    const lead = collapsed.length - collapsed.trimStart().length;
    const text = collapsed.trim();
    const remapped = styles
        .map(([s, e, k]) => {
        const cs = Math.max(0, (map[s] ?? 0) - lead);
        const ce = Math.max(cs, (map[e] ?? collapsed.length) - lead);
        return [cs, Math.min(ce, text.length), k];
    })
        .filter(([s, e]) => e > s && s < text.length);
    return { text, styles: remapped };
}
