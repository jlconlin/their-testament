// Canonical structure of the standard works, plus classification of an
// annotation's source URI into a Part / book / out-of-scope bucket.
//
// Order comes from these slug lists (position = canonical order). Display names
// are taken from the fetched page's `meta.title` (minus a trailing chapter
// number), with a few overrides for titles that don't follow that pattern.
export const SCRIPTURE_PARTS = [
    { key: "ot", title: "Old Testament", collections: ["ot"], order: 1 },
    { key: "nt", title: "New Testament", collections: ["nt"], order: 2 },
    { key: "bofm", title: "Book of Mormon", collections: ["bofm"], order: 3 },
    { key: "dc", title: "Doctrine and Covenants", collections: ["dc-testament"], order: 4 },
    { key: "pgp", title: "Pearl of Great Price", collections: ["pgp"], order: 5 },
    // The JST is scripture; study aids are not, so they get their own Part.
    { key: "other-scripture", title: "Other Scripture", collections: ["jst"], order: 6 },
];
/** Where the two non-scripture Parts sit in the book. */
export const HELPS_PART = { key: "helps", title: "Scripture Helps", order: 7 };
export const MAGAZINES_PART = { key: "magazines", title: "Magazines", order: 92 };
export const MANUALS_PART = { key: "manuals", title: "Manuals and Guides", order: 93 };
/** Study aids: topical entries with no chapter numbers. */
export const HELP_COLLECTIONS = {
    tg: "Topical Guide",
    bd: "Bible Dictionary",
    index: "Index to the Triple Combination",
    "triple-index": "Index to the Triple Combination",
    gs: "Guide to the Scriptures",
};
export const HELP_ORDER = [...Object.keys(HELP_COLLECTIONS), "proclamations"];
/**
 * Documents filed under /scriptures that are neither a chapter nor a study
 * aid. They are short, they are marked often, and without an entry here every
 * mark on them is dropped -- so they get one section of their own.
 */
/**
 * A volume's front matter: the documents bound in before its first book.
 *
 * The Book of Mormon's are the ones people mark -- the title page, the two
 * testimonies of the witnesses, Joseph Smith's own account -- but every volume
 * has some, so this is keyed by collection and anything not listed still gets
 * placed (alphabetically, after the named ones) rather than dropped.
 */
const FRONT_ORDER = {
    ot: ["title-page", "dedication"],
    nt: ["title-page"],
    bofm: ["title-page", "bofm-title", "introduction", "three", "eight", "js",
        "explanation", "illustrations", "pronunciation", "reference"],
    "dc-testament": ["title-page", "introduction", "chron-order"],
    pgp: ["title-page", "introduction"],
};
/** Position of a front-matter document within its volume; unlisted sort last. */
export function frontOrder(collection, slug) {
    const i = FRONT_ORDER[collection]?.indexOf(slug) ?? -1;
    return i >= 0 ? i : 100;
}
export const PROCLAMATION_COLLECTIONS = new Set([
    "the-family-a-proclamation-to-the-world",
    "the-restoration-of-the-fulness-of-the-gospel-of-jesus-christ",
]);
/**
 * Periodicals, keyed by the first URI segment. They share General Conference's
 * shape -- /<pub>/YYYY/MM/<slug> -- so they group the same way: decade, then
 * issue, then article.
 */
export const MAGAZINES = {
    ensign: "Ensign",
    liahona: "Liahona",
    "new-era": "New Era",
    "ya-weekly": "YA Weekly",
    ftsoy: "For the Strength of Youth",
    friend: "Friend",
};
export const MAGAZINE_ORDER = Object.keys(MAGAZINES);
// Ordered book slugs per collection. Front-matter / non-chapter slugs are omitted
// on purpose (they show up as "uncategorised" in the validation report).
const BOOK_ORDER = {
    ot: "gen ex lev num deut josh judg ruth 1-sam 2-sam 1-kgs 2-kgs 1-chr 2-chr ezra neh esth job ps prov eccl song isa jer lam ezek dan hosea joel amos obad jonah micah nahum hab zeph hag zech mal".split(" "),
    nt: "matt mark luke john acts rom 1-cor 2-cor gal eph philip col 1-thes 2-thes 1-tim 2-tim titus philem heb james 1-pet 2-pet 1-jn 2-jn 3-jn jude rev".split(" "),
    bofm: "1-ne 2-ne jacob enos jarom omni w-of-m mosiah alma hel 3-ne 4-ne morm ether moro".split(" "),
    "dc-testament": ["dc", "od"],
    pgp: ["moses", "abr", "js-m", "js-h", "a-of-f"],
    // Every book with a JST selection, in the order the appendix lists them.
    // A short list here is not cosmetic: a slug that is missing classifies as
    // "unknown book" and the marks on it are dropped from the book entirely.
    jst: "jst-gen jst-ex jst-deut jst-1-sam jst-2-sam jst-1-chr jst-2-chr jst-ps jst-isa jst-jer jst-amos jst-matt jst-mark jst-luke jst-john jst-acts jst-rom jst-1-cor jst-2-cor jst-gal jst-eph jst-col jst-1-thes jst-2-thes jst-1-tim jst-heb jst-james jst-1-pet jst-2-pet jst-1-jn jst-rev".split(" "),
};
const NAME_OVERRIDE = {
    "ot/ps": "Psalms",
    "ot/song": "Song of Solomon",
    "nt/philip": "Philippians",
    "nt/philem": "Philemon",
    "bofm/w-of-m": "Words of Mormon",
    "dc-testament/dc": "Doctrine and Covenants",
    "dc-testament/od": "Official Declarations",
    "pgp/js-m": "Joseph Smith—Matthew",
    "pgp/js-h": "Joseph Smith—History",
    "pgp/a-of-f": "The Articles of Faith",
    "jst/jst-gen": "JST, Genesis",
    "jst/jst-matt": "JST, Matthew",
    "jst/jst-mark": "JST, Mark",
    "jst/jst-luke": "JST, Luke",
    "jst/jst-john": "JST, John",
};
const CHAPTER_WORD = {
    "dc-testament/dc": "Section",
    "dc-testament/od": "Official Declaration",
    "ot/ps": "Psalm",
};
// Official abbreviations, from
// churchofjesuschrist.org/study/scriptures/quad/quad/abbreviations
const ABBREV = {
    "ot/gen": "Gen.", "ot/ex": "Ex.", "ot/lev": "Lev.", "ot/num": "Num.",
    "ot/deut": "Deut.", "ot/josh": "Josh.", "ot/judg": "Judg.", "ot/ruth": "Ruth",
    "ot/1-sam": "1 Sam.", "ot/2-sam": "2 Sam.", "ot/1-kgs": "1 Kgs.", "ot/2-kgs": "2 Kgs.",
    "ot/1-chr": "1 Chr.", "ot/2-chr": "2 Chr.", "ot/ezra": "Ezra", "ot/neh": "Neh.",
    "ot/esth": "Esth.", "ot/job": "Job", "ot/ps": "Ps.", "ot/prov": "Prov.",
    "ot/eccl": "Eccl.", "ot/song": "Song", "ot/isa": "Isa.", "ot/jer": "Jer.",
    "ot/lam": "Lam.", "ot/ezek": "Ezek.", "ot/dan": "Dan.", "ot/hosea": "Hosea",
    "ot/joel": "Joel", "ot/amos": "Amos", "ot/obad": "Obad.", "ot/jonah": "Jonah",
    "ot/micah": "Micah", "ot/nahum": "Nahum", "ot/hab": "Hab.", "ot/zeph": "Zeph.",
    "ot/hag": "Hag.", "ot/zech": "Zech.", "ot/mal": "Mal.",
    "nt/matt": "Matt.", "nt/mark": "Mark", "nt/luke": "Luke", "nt/john": "John",
    "nt/acts": "Acts", "nt/rom": "Rom.", "nt/1-cor": "1 Cor.", "nt/2-cor": "2 Cor.",
    "nt/gal": "Gal.", "nt/eph": "Eph.", "nt/philip": "Philip.", "nt/col": "Col.",
    "nt/1-thes": "1 Thes.", "nt/2-thes": "2 Thes.", "nt/1-tim": "1 Tim.", "nt/2-tim": "2 Tim.",
    "nt/titus": "Titus", "nt/philem": "Philem.", "nt/heb": "Heb.", "nt/james": "James",
    "nt/1-pet": "1 Pet.", "nt/2-pet": "2 Pet.", "nt/1-jn": "1 Jn.", "nt/2-jn": "2 Jn.",
    "nt/3-jn": "3 Jn.", "nt/jude": "Jude", "nt/rev": "Rev.",
    "bofm/1-ne": "1 Ne.", "bofm/2-ne": "2 Ne.", "bofm/jacob": "Jacob", "bofm/enos": "Enos",
    "bofm/jarom": "Jarom", "bofm/omni": "Omni", "bofm/w-of-m": "W of M", "bofm/mosiah": "Mosiah",
    "bofm/alma": "Alma", "bofm/hel": "Hel.", "bofm/3-ne": "3 Ne.", "bofm/4-ne": "4 Ne.",
    "bofm/morm": "Morm.", "bofm/ether": "Ether", "bofm/moro": "Moro.",
    "dc-testament/dc": "D&C", "dc-testament/od": "OD",
    "pgp/moses": "Moses", "pgp/abr": "Abr.", "pgp/js-m": "JS—M", "pgp/js-h": "JS—H",
    "pgp/a-of-f": "A of F",
    "jst/jst-gen": "JST Gen.", "jst/jst-ex": "JST Ex.", "jst/jst-matt": "JST Matt.",
    "jst/jst-mark": "JST Mark", "jst/jst-luke": "JST Luke", "jst/jst-john": "JST John",
};
// "jst-1-pet" abbreviates as "JST 1 Pet." -- derive them rather than keeping a
// second 31-entry table in sync with the first.
for (const slug of BOOK_ORDER.jst ?? []) {
    const base = slug.replace(/^jst-/, "");
    const src = ABBREV[`ot/${base}`] ?? ABBREV[`nt/${base}`];
    if (src)
        ABBREV[`jst/${slug}`] = `JST ${src}`;
}
export function abbrev(collection, slug) {
    return ABBREV[`${collection}/${slug}`] ?? slug;
}
const CHAP_RE = /^\/scriptures\/([^/]+)\/([^/]+)\/(\d+)(?:[.?#]|$)/;
const GC_RE = /^\/general-conference\/(\d{4})\/(\d{2})\/([a-z0-9-]+)(?:[.?#]|$)/;
// /scriptures/tg/faith  ·  /scriptures/gs/living-water.p3
const HELP_RE = /^\/scriptures\/(tg|bd|gs|index|triple-index)\/([a-z0-9-]+)(?:[.?#]|$)/;
const PROC_RE = /^\/scriptures\/([a-z0-9-]+)\/([a-z0-9-]+)(?:[.?#]|$)/;
// /ensign/2008/11/the-healing-power-of-forgiveness, but an issue may also file
// an article under a section: /ensign/2016/05/sunday-morning-session/choices,
// /liahona/2022/02/digital-only/…, /liahona/2023/10/eur-eng-local-pages/….
// Those sections are not worth an outline level, so the whole path after the
// month is treated as the article's slug.
// Slugs occasionally carry an underscore ("03_trust-god-and-let-him-prevail").
const MAG_RE = /^\/(ensign|liahona|new-era|friend|ya-weekly|ftsoy)\/(\d{4})\/(\d{2})\/([a-z0-9_-]+(?:\/[a-z0-9_-]+)*)(?:[.?#]|$)/;
// /manual/teachings-george-albert-smith/chapter-8 -- the document path may be
// more than one segment (/manual/<m>/the-book-of-exodus/exodus-14-15).
const MANUAL_RE = /^\/manual\/([a-z0-9_-]+)\/([a-z0-9_-]+(?:\/[a-z0-9_-]+)*)(?:[.?#]|$)/;
// /broadcasts/article/christmas-devotional/2011/12/because-he-came -- the
// series path is one or more segments, so it is matched loosely.
const BROADCAST_RE = /^\/broadcasts\/([a-z0-9_-]+(?:\/[a-z0-9_-]+)*)\/(\d{4})\/(\d{2})\/([a-z0-9_-]+)(?:[.?#]|$)/;
export function classify(uri) {
    if (!uri)
        return { scope: "uncategorised", reason: "no uri", uri: "" };
    const top = uri.replace(/^\//, "").split("/")[0] ?? "";
    const gc = uri.match(GC_RE);
    if (gc) {
        return { scope: "gc", year: gc[1], month: gc[2], slug: gc[3], docUri: `/general-conference/${gc[1]}/${gc[2]}/${gc[3]}` };
    }
    const proc = uri.match(PROC_RE);
    if (proc && PROCLAMATION_COLLECTIONS.has(proc[1])) {
        return {
            scope: "help", collection: "proclamations", collectionTitle: "Proclamations",
            entry: proc[2], docUri: `/scriptures/${proc[1]}/${proc[2]}`,
        };
    }
    const help = uri.match(HELP_RE);
    if (help) {
        const collection = help[1];
        return {
            scope: "help", collection, collectionTitle: HELP_COLLECTIONS[collection] ?? collection,
            entry: help[2], docUri: `/scriptures/${collection}/${help[2]}`,
        };
    }
    const mag = uri.match(MAG_RE);
    if (mag) {
        const pub = mag[1];
        return {
            scope: "magazine", pub, pubTitle: MAGAZINES[pub] ?? pub,
            year: mag[2], month: mag[3], slug: mag[4],
            docUri: `/${pub}/${mag[2]}/${mag[3]}/${mag[4]}`,
        };
    }
    const bc = uri.match(BROADCAST_RE);
    if (bc) {
        // the series stands in for a publication name; "article" is a routing
        // segment, not part of the series ("article/christmas-devotional").
        const series = bc[1];
        const pubTitle = series.split("/").at(-1)
            .replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return {
            scope: "magazine", pub: `broadcasts/${series}`, pubTitle,
            year: bc[2], month: bc[3], slug: bc[4],
            docUri: `/broadcasts/${series}/${bc[2]}/${bc[3]}/${bc[4]}`,
        };
    }
    const man = uri.match(MANUAL_RE);
    if (man) {
        return {
            scope: "manual", manual: man[1], docPath: man[2],
            docUri: `/manual/${man[1]}/${man[2]}`,
        };
    }
    const ch = uri.match(CHAP_RE);
    if (ch) {
        const [, collection, bookSlug, chapStr] = ch;
        const part = SCRIPTURE_PARTS.find((p) => p.collections.includes(collection));
        const order = BOOK_ORDER[collection]?.indexOf(bookSlug);
        if (part && order !== undefined && order >= 0) {
            return {
                scope: "scripture",
                partKey: part.key, partTitle: part.title, partOrder: part.order,
                collection, bookSlug, bookOrder: order, chapter: Number(chapStr),
                docUri: `/scriptures/${collection}/${bookSlug}/${chapStr}`,
            };
        }
        return { scope: "uncategorised", reason: `unknown book ${collection}/${bookSlug}`, uri };
    }
    // Front matter: /scriptures/<volume>/<document>, with no chapter number and
    // a slug that is not one of the volume's books.
    const fm = uri.match(PROC_RE);
    if (fm) {
        const collection = fm[1], slug = fm[2];
        const part = SCRIPTURE_PARTS.find((p) => p.collections.includes(collection));
        if (part && !(BOOK_ORDER[collection] ?? []).includes(slug)) {
            return {
                scope: "front",
                partKey: part.key, partTitle: part.title, partOrder: part.order,
                collection, slug, frontOrder: frontOrder(collection, slug),
                docUri: `/scriptures/${collection}/${slug}`,
            };
        }
    }
    if (top === "scriptures")
        return { scope: "uncategorised", reason: "scripture non-chapter (front matter / anchor)", uri };
    return { scope: "out", reason: `source "${top}" not in current scope`, top };
}
/** "a-parents-guide" -> "A Parents Guide" -- a last resort for a missing index. */
export function titleFromSlug(slug) {
    const small = new Set(["a", "an", "and", "as", "at", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
    return slug.split("-").map((w, i) => i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
export function bookName(collection, slug, fetchedTitle) {
    const key = `${collection}/${slug}`;
    if (NAME_OVERRIDE[key])
        return NAME_OVERRIDE[key];
    if (fetchedTitle)
        return fetchedTitle.replace(/\s+\d+[a-z]?$/i, "").trim();
    return slug;
}
export function chapterWord(collection, slug) {
    return CHAPTER_WORD[`${collection}/${slug}`] ?? "Chapter";
}
