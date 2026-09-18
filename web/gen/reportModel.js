/** Gospel Library's top-level URI segments, in words a reader would use. */
export const SOURCE_LABEL = {
    ensign: "the Ensign",
    liahona: "the Liahona",
    "new-era": "the New Era",
    friend: "the Friend",
    ftsoy: "For the Strength of Youth",
    manual: "manuals and lesson material",
    broadcasts: "broadcasts",
    "ya-weekly": "YA Weekly",
    youth: "the youth curriculum",
    scriptures: "scripture front matter",
    video: "videos",
};
const plural = (k, one, many) => (k === 1 ? one : many);
const num = (k) => k.toLocaleString("en-US");
/** "a", "a and b", "a, b, and c" */
function joinList(xs) {
    if (xs.length <= 1)
        return xs.join("");
    if (xs.length === 2)
        return `${xs[0]} and ${xs[1]}`;
    return `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`;
}
export function buildReportModel(input) {
    const { summary, unplacedCount, unplacedFromUnavailable, outOfScope } = input;
    const n = (k) => summary.byCategory[k] ?? 0;
    const gone = n("source-unavailable");
    const notShown = n("pid-no-match"); // the only genuine miss
    const outside = outOfScope?.highlights ?? 0;
    const whole = n("whole-unit-fallback") + n("empty-span");
    const missing = gone + notShown + outside;
    // ---- headline: one sentence, and true ---------------------------------
    // It has to account for *everything* not in the book. An earlier version
    // said "11 marks are in sources it doesn't cover yet" and left it there --
    // implying eleven were missing when another five hundred, on retired pages,
    // were too. Out-of-scope marks never reach the diagnostics (they are
    // filtered out before assembly), so they are added to the total here.
    const total = summary.total + outside;
    const headline = missing === 0
        ? `Everything you marked is in your book — all ${num(summary.total)} of them.`
        : missing / total < 0.05
            ? "Nearly everything you marked is in your book."
            : "Most of what you marked is in your book.";
    // ---- what is not in it -----------------------------------------------
    const left = [];
    if (gone) {
        const kept = unplacedFromUnavailable;
        left.push(`${num(gone)} ${plural(gone, "mark is", "marks are")} on pages or passages the Church no longer ` +
            `publishes — retired manuals, mostly. What they said can't be reproduced` +
            (kept
                ? `, but the ${num(kept)} ${plural(kept, "note", "notes")} you wrote on them ${plural(kept, "is", "are")} ` +
                    `kept in Miscellaneous.`
                : `.`));
    }
    if (outside) {
        const named = (outOfScope.bySource ?? []).slice(0, 4)
            .map(([name, k]) => `${SOURCE_LABEL[name] ?? name} (${num(k)})`);
        const withContent = outOfScope.annotationsWithContent ?? 0;
        left.push(`${num(outside)} ${plural(outside, "mark is", "marks are")} in sources Their Testament doesn't cover yet — ` +
            `${joinList(named)}` +
            (withContent ? `; ${num(withContent)} of them ${plural(withContent, "has", "have")} a note or tag of your own` : "") +
            `. Your export file keeps every one.`);
    }
    if (notShown) {
        left.push(`${num(notShown)} ${plural(notShown, "highlight sits", "highlights sit")} on ` +
            `${plural(notShown, "a paragraph", "paragraphs")} this tool couldn't read, so ` +
            `${plural(notShown, "it isn't", "they aren't")} shown.`);
    }
    // ---- what is in it, but worth a sentence -----------------------------
    const handled = [];
    if (whole) {
        handled.push(`${num(whole)} ${plural(whole, "verse is", "verses are")} marked in full, because the exact words you ` +
            `selected couldn't be pinned down.`);
    }
    if (n("heading-highlight")) {
        const k = n("heading-highlight");
        handled.push(`${num(k)} ${plural(k, "highlight was", "highlights were")} on a chapter heading or summary. Where you ` +
            `marked words, those words are shown beneath the heading; where you chose no color, the tag or note ` +
            `carries on its own.`);
    }
    if (n("chapter-note")) {
        const k = n("chapter-note");
        handled.push(`${num(k)} ${plural(k, "note", "notes")} written on a chapter heading ${plural(k, "sits", "sit")} at the ` +
            `top of that chapter.`);
    }
    const elsewhere = Math.max(0, unplacedCount - unplacedFromUnavailable);
    if (elsewhere) {
        handled.push(`${num(elsewhere)} ${plural(elsewhere, "note couldn't", "notes couldn't")} be attached to a spot, so ` +
            `${plural(elsewhere, "it's", "they're")} kept in "Miscellaneous" near the back rather than dropped.`);
    }
    // ---- the rows behind it ------------------------------------------------
    // Retired content is counted above, not listed: several hundred identical
    // rows of "no longer published", each with an annotation id nobody can act
    // on, would read as several hundred problems.
    const rows = [
        ...summary.warningRows.filter((d) => d.category !== "source-unavailable")
            .map((diag) => ({ diag, level: "cat-warning" })),
        ...summary.failedRows.map((diag) => ({ diag, level: "cat-failed" })),
    ];
    return { headline, left, handled, rows };
}
