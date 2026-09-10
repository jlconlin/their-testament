import { classify } from "./scripture.js";
/**
 * Which documents a run will need, worked out from the annotations alone.
 *
 * The point is to know the whole list *before* assembly starts, so it can be
 * fetched concurrently into the cache instead of one at a time as assembly
 * stumbles across each one. Assembly itself is unchanged and still asks for
 * documents one by one -- they just turn into cache hits.
 *
 * Derivation goes through `classify()`, the same function assembly uses, so
 * the two cannot drift apart. Anything classify doesn't recognize is left out
 * deliberately: assembly will still fetch it serially if it turns out to be
 * needed (notebook "passage" entries pointing outside scripture and General
 * Conference are the real case, and there are a handful, not a thousand).
 * Prefetching the bulk is the win; completeness here is not required for
 * correctness, only for speed.
 */
export function planContentUris(annotations) {
    const uris = new Set();
    const indexes = new Set();
    for (const a of annotations) {
        for (const h of a.highlights ?? []) {
            const c = classify(h.uri);
            if (c.scope === "scripture" || c.scope === "help" || c.scope === "magazine" || c.scope === "manual") {
                uris.add(c.docUri);
            }
            if (c.scope === "gc") {
                uris.add(c.docUri);
                indexes.add(`/general-conference/${c.year}/${c.month}`);
            }
            // manuals are ordered and titled from the manual's own index page
            if (c.scope === "manual")
                indexes.add(`/manual/${c.manual}`);
        }
    }
    // the index pages, which assembly reads to order and name what is under them
    for (const c of indexes)
        uris.add(c);
    return [...uris];
}
