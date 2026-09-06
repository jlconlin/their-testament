import { classify } from "./scripture.ts";
import type { Annotation } from "./types.ts";

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
export function planContentUris(annotations: Annotation[]): string[] {
  const uris = new Set<string>();
  const conferences = new Set<string>();

  for (const a of annotations) {
    for (const h of a.highlights ?? []) {
      const c = classify(h.uri);
      if (c.scope === "scripture") uris.add(c.docUri);
      else if (c.scope === "gc") {
        uris.add(c.docUri);
        conferences.add(`/general-conference/${c.year}/${c.month}`);
      }
    }
  }

  // assembleGC also reads each conference's index page, to order the talks
  for (const c of conferences) uris.add(c);

  return [...uris];
}
