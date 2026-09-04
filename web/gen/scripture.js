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
    // stragglers land here so nothing is silently dropped
    { key: "other-scripture", title: "Other Scripture", collections: ["jst", "bd", "gs"], order: 6 },
];
// Ordered book slugs per collection. Front-matter / non-chapter slugs are omitted
// on purpose (they show up as "uncategorised" in the validation report).
const BOOK_ORDER = {
    ot: "gen ex lev num deut josh judg ruth 1-sam 2-sam 1-kgs 2-kgs 1-chr 2-chr ezra neh esth job ps prov eccl song isa jer lam ezek dan hosea joel amos obad jonah micah nahum hab zeph hag zech mal".split(" "),
    nt: "matt mark luke john acts rom 1-cor 2-cor gal eph philip col 1-thes 2-thes 1-tim 2-tim titus philem heb james 1-pet 2-pet 1-jn 2-jn 3-jn jude rev".split(" "),
    bofm: "1-ne 2-ne jacob enos jarom omni w-of-m mosiah alma hel 3-ne 4-ne morm ether moro".split(" "),
    "dc-testament": ["dc", "od"],
    pgp: ["moses", "abr", "js-m", "js-h", "a-of-f"],
    jst: ["jst-gen", "jst-ex", "jst-matt", "jst-mark", "jst-luke", "jst-john"],
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
export function abbrev(collection, slug) {
    return ABBREV[`${collection}/${slug}`] ?? slug;
}
const CHAP_RE = /^\/scriptures\/([^/]+)\/([^/]+)\/(\d+)(?:[.?#]|$)/;
const GC_RE = /^\/general-conference\/(\d{4})\/(\d{2})\/([a-z0-9-]+)(?:[.?#]|$)/;
export function classify(uri) {
    if (!uri)
        return { scope: "uncategorised", reason: "no uri", uri: "" };
    const top = uri.replace(/^\//, "").split("/")[0] ?? "";
    const gc = uri.match(GC_RE);
    if (gc) {
        return { scope: "gc", year: gc[1], month: gc[2], slug: gc[3], docUri: `/general-conference/${gc[1]}/${gc[2]}/${gc[3]}` };
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
    if (top === "scriptures")
        return { scope: "uncategorised", reason: "scripture non-chapter (front matter / anchor)", uri };
    return { scope: "out", reason: `source "${top}" not in current scope`, top };
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
