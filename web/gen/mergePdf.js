var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// Concatenate several already-compiled PDFs into one, entirely client-side,
// preserving PDF bookmarks (outlines) across the join.
//
// Used to turn the front-matter + per-Part + back-matter PDFs from
// renderBookMultiPart (split to avoid the WASM stack overflow on a large
// single-pass compile -- see browserRender.ts) back into a single
// downloadable file, without losing the nested Part > Book > Chapter
// bookmarks Typst already builds correctly into each piece.
//
// pdf-lib's copyPages() copies page content but not each source's
// /Outlines tree, so this reads that tree with pdf-lib's low-level (public,
// documented -- just not high-level-API-covered) PDFDict/PDFName/PDFRef
// primitives and rebuilds it in the destination, remapping each item's
// target page by position (copyPages preserves page order, so a source's
// local page index N is the (N)th page it contributed to the merged doc).
const PDF_LIB_URL = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js";
let pdfLibPromise;
function loadPdfLib() {
    return (pdfLibPromise ??= import(__rewriteRelativeImportExtension(/* webpackIgnore: true */ PDF_LIB_URL)));
}
// Cross-file link markers. book.typ emits these as ordinary link annotations
// with an unknown URI scheme (Typst passes the string through verbatim), which
// is the one machine-readable channel that survives both PDF export and
// copyPages. "ttdef" marks where a key lives, "ttref" marks a mention of it.
const DEF_PREFIX = "ttdef://";
const REF_PREFIX = "ttref://";
/** The URI of a link annotation, or null if it isn't a URI link. */
function annotUri(lib, context, entry) {
    const annot = entry instanceof lib.PDFRef ? context.lookup(entry) : entry;
    if (!(annot instanceof lib.PDFDict))
        return null;
    let action = annot.get(lib.PDFName.of("A"));
    if (action instanceof lib.PDFRef)
        action = context.lookup(action);
    if (!(action instanceof lib.PDFDict))
        return null;
    const uri = action.get(lib.PDFName.of("URI"));
    if (uri instanceof lib.PDFString || uri instanceof lib.PDFHexString)
        return uri.decodeText();
    return null;
}
/**
 * Where each annotation on each page points, as a page index within its own
 * source document.
 *
 * copyPages carries link annotations across but not usefully: a /Dest naming a
 * page comes out pointing at a duplicate of that page that never gets added to
 * the page tree, so every in-document link (a Part's contents page, say) is
 * dead in the merged file. Recording the targets by position before the copy
 * lets them be re-pointed at the real merged pages afterwards -- the same
 * remap the outline tree needs.
 */
function readLinkTargets(lib, srcDoc, srcPageRefs) {
    return srcDoc.getPages().map((page) => {
        const annots = page.node.Annots();
        if (!annots)
            return [];
        const targets = [];
        for (let k = 0; k < annots.size(); k++) {
            let annot = annots.get(k);
            if (annot instanceof lib.PDFRef)
                annot = srcDoc.context.lookup(annot);
            targets.push(annot instanceof lib.PDFDict ? destPageIndexOf(lib, srcDoc.context, annot, srcPageRefs) : null);
        }
        return targets;
    });
}
/** Point each copied page's links back at the merged pages they meant. */
function remapLinks(lib, destDoc, copied, targets) {
    const { PDFName } = lib;
    copied.forEach((page, i) => {
        const annots = page.node.Annots();
        if (!annots)
            return;
        const pageTargets = targets[i] ?? [];
        for (let k = 0; k < annots.size(); k++) {
            const target = pageTargets[k];
            if (target == null || !copied[target])
                continue;
            let annot = annots.get(k);
            if (annot instanceof lib.PDFRef)
                annot = destDoc.context.lookup(annot);
            if (!(annot instanceof lib.PDFDict))
                continue;
            annot.delete(PDFName.of("A"));
            annot.set(PDFName.of("Dest"), destDoc.context.obj([copied[target].ref, PDFName.of("XYZ"), null, null, null]));
        }
    });
}
/** Page index (0-based) of every "ttdef" anchor in a compiled piece. */
export async function readAnchors(bytes) {
    const lib = await loadPdfLib();
    const doc = await lib.PDFDocument.load(bytes);
    const found = new Map();
    doc.getPages().forEach((page, i) => {
        const annots = page.node.Annots();
        if (!annots)
            return;
        for (let k = 0; k < annots.size(); k++) {
            const uri = annotUri(lib, doc.context, annots.get(k));
            if (uri?.startsWith(DEF_PREFIX)) {
                const key = uri.slice(DEF_PREFIX.length);
                if (!found.has(key))
                    found.set(key, i);
            }
        }
    });
    return found;
}
export async function pageCount(bytes) {
    const lib = await loadPdfLib();
    return (await lib.PDFDocument.load(bytes)).getPageCount();
}
/**
 * Turn the cross-file markers into real jumps, now that every piece shares one
 * page space: each "ttref" becomes a GoTo pointing at the page its matching
 * "ttdef" landed on, and the anchors themselves are removed so they don't stay
 * behind as dead links on the text they were attached to.
 */
function resolveCrossLinks(lib, destDoc) {
    const { PDFName } = lib;
    const pages = destDoc.getPages();
    const defs = new Map();
    const refs = [];
    pages.forEach((page, i) => {
        const annots = page.node.Annots();
        if (!annots)
            return;
        for (let k = 0; k < annots.size(); k++) {
            const uri = annotUri(lib, destDoc.context, annots.get(k));
            if (!uri)
                continue;
            if (uri.startsWith(DEF_PREFIX)) {
                const key = uri.slice(DEF_PREFIX.length);
                if (!defs.has(key))
                    defs.set(key, i);
            }
            else if (uri.startsWith(REF_PREFIX)) {
                refs.push({ annots, slot: k, key: uri.slice(REF_PREFIX.length) });
            }
        }
    });
    for (const ref of refs) {
        let annot = ref.annots.get(ref.slot);
        if (annot instanceof lib.PDFRef)
            annot = destDoc.context.lookup(annot);
        if (!(annot instanceof lib.PDFDict))
            continue;
        const target = defs.get(ref.key);
        if (target === undefined) {
            // Nothing claimed this key -- drop the action rather than leave a link
            // that would open a "ttref://" URI in the reader's browser.
            annot.delete(PDFName.of("A"));
            continue;
        }
        annot.set(PDFName.of("A"), destDoc.context.obj({
            S: PDFName.of("GoTo"),
            D: destDoc.context.obj([pages[target].ref, PDFName.of("XYZ"), null, null, null]),
        }));
    }
    for (const page of pages) {
        const annots = page.node.Annots();
        if (!annots)
            continue;
        const keep = [];
        for (let k = 0; k < annots.size(); k++) {
            const entry = annots.get(k);
            if (annotUri(lib, destDoc.context, entry)?.startsWith(DEF_PREFIX))
                continue;
            keep.push(entry);
        }
        if (keep.length !== annots.size())
            page.node.set(PDFName.of("Annots"), destDoc.context.obj(keep));
    }
}
function decodeTitle(lib, obj) {
    if (obj instanceof lib.PDFString || obj instanceof lib.PDFHexString)
        return obj.decodeText();
    return "(untitled)";
}
/** Resolve an outline item's target to a page index within its own source doc. */
function destPageIndexOf(lib, context, itemDict, srcPageRefs) {
    let destArray = null;
    const dest = itemDict.get(lib.PDFName.of("Dest"));
    if (dest instanceof lib.PDFArray)
        destArray = dest;
    else if (dest instanceof lib.PDFRef) {
        const resolved = context.lookup(dest);
        if (resolved instanceof lib.PDFArray)
            destArray = resolved;
    }
    else {
        const action = itemDict.get(lib.PDFName.of("A"));
        const actionDict = action instanceof lib.PDFRef ? context.lookup(action) : action;
        if (actionDict instanceof lib.PDFDict) {
            const d = actionDict.get(lib.PDFName.of("D"));
            if (d instanceof lib.PDFArray)
                destArray = d;
            else if (d instanceof lib.PDFRef) {
                const resolved = context.lookup(d);
                if (resolved instanceof lib.PDFArray)
                    destArray = resolved;
            }
        }
    }
    if (!destArray)
        return null;
    const pageRefOrObj = destArray.get(0);
    if (!(pageRefOrObj instanceof lib.PDFRef))
        return null;
    const idx = srcPageRefs.findIndex((r) => r.tag === pageRefOrObj.tag && r.objectNumber === pageRefOrObj.objectNumber);
    return idx >= 0 ? idx : null;
}
function walkOutline(lib, context, dict, srcPageRefs) {
    const items = [];
    let curRef = dict.get(lib.PDFName.of("First"));
    while (curRef) {
        const item = context.lookup(curRef, lib.PDFDict);
        const title = item.get(lib.PDFName.of("Title"));
        items.push({
            title: title ? decodeTitle(lib, title) : "(untitled)",
            pageIndex: destPageIndexOf(lib, context, item, srcPageRefs),
            children: walkOutline(lib, context, item, srcPageRefs),
        });
        curRef = item.get(lib.PDFName.of("Next"));
    }
    return items;
}
/** Build a sibling chain of outline dicts in destDoc; returns its ends + total count (for the parent's own Count). */
function buildOutline(lib, destDoc, items, destPages) {
    let firstRef = null, lastRef = null, prevRef = null, totalCount = 0;
    for (const it of items) {
        const dict = destDoc.context.obj({});
        dict.set(lib.PDFName.of("Title"), lib.PDFHexString.fromText(it.title));
        if (it.pageIndex != null && destPages[it.pageIndex]) {
            const destArr = destDoc.context.obj([destPages[it.pageIndex].ref, lib.PDFName.of("Fit")]);
            dict.set(lib.PDFName.of("Dest"), destArr);
        }
        const ref = destDoc.context.register(dict);
        if (prevRef) {
            destDoc.context.lookup(prevRef, lib.PDFDict).set(lib.PDFName.of("Next"), ref);
            dict.set(lib.PDFName.of("Prev"), prevRef);
        }
        firstRef ??= ref;
        lastRef = ref;
        prevRef = ref;
        totalCount += 1;
        if (it.children.length) {
            const kids = buildOutline(lib, destDoc, it.children, destPages);
            if (kids.firstRef) {
                dict.set(lib.PDFName.of("First"), kids.firstRef);
                dict.set(lib.PDFName.of("Last"), kids.lastRef);
                dict.set(lib.PDFName.of("Count"), lib.PDFNumber.of(kids.count));
                totalCount += kids.count;
            }
        }
    }
    return { firstRef, lastRef, count: totalCount };
}
export async function mergePdfs(pdfs) {
    const lib = await loadPdfLib();
    const { PDFDocument, PDFName, PDFDict, PDFNumber } = lib;
    const destDoc = await PDFDocument.create();
    const chains = [];
    for (const bytes of pdfs) {
        const srcDoc = await PDFDocument.load(bytes);
        const srcPageRefs = srcDoc.getPages().map((p) => p.ref);
        const linkTargets = readLinkTargets(lib, srcDoc, srcPageRefs);
        const copied = await destDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        remapLinks(lib, destDoc, copied, linkTargets);
        for (const p of copied)
            destDoc.addPage(p);
        const outlinesRef = srcDoc.catalog.get(PDFName.of("Outlines"));
        const items = outlinesRef
            ? walkOutline(lib, srcDoc.context, srcDoc.context.lookup(outlinesRef, PDFDict), srcPageRefs)
            : [];
        chains.push(buildOutline(lib, destDoc, items, copied));
    }
    let firstRef = null, lastRef = null, prevRef = null, totalCount = 0;
    for (const chain of chains) {
        if (!chain.firstRef)
            continue;
        if (prevRef) {
            destDoc.context.lookup(prevRef, PDFDict).set(PDFName.of("Next"), chain.firstRef);
            destDoc.context.lookup(chain.firstRef, PDFDict).set(PDFName.of("Prev"), prevRef);
        }
        firstRef ??= chain.firstRef;
        lastRef = chain.lastRef;
        prevRef = chain.lastRef;
        totalCount += chain.count;
    }
    if (firstRef) {
        const root = destDoc.context.obj({
            Type: PDFName.of("Outlines"),
            First: firstRef,
            Last: lastRef,
            Count: PDFNumber.of(totalCount),
        });
        destDoc.catalog.set(PDFName.of("Outlines"), destDoc.context.register(root));
    }
    resolveCrossLinks(lib, destDoc);
    return destDoc.save();
}
