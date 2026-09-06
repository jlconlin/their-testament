export const FAIL_CATEGORIES = ["pid-no-match", "empty-span", "note-no-anchor", "note-parse-empty"];
export const WARN_CATEGORIES = ["whole-unit-fallback"];
// "chapter-note" and "heading-highlight" are outcomes, not problems: the first
// places a note at the head of its chapter, the second is a highlight on a
// heading where there is no verse to mark. Neither loses anything, so neither
// belongs in a failure count shown to someone who just made a keepsake.
export const OK_CATEGORIES = ["located", "clear", "chapter-note", "heading-highlight"];
export function diagLevel(category) {
    if (FAIL_CATEGORIES.includes(category))
        return "failed";
    if (WARN_CATEGORIES.includes(category))
        return "warning";
    return "clean";
}
/** No silent failure: every non-clean row is returned, not just counted. */
export function summarizeDiags(diags) {
    const byCategory = {};
    let clean = 0, warning = 0, failed = 0;
    const warningRows = [];
    const failedRows = [];
    for (const d of diags) {
        byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
        const level = diagLevel(d.category);
        if (level === "clean")
            clean++;
        else if (level === "warning") {
            warning++;
            warningRows.push(d);
        }
        else {
            failed++;
            failedRows.push(d);
        }
    }
    return { total: diags.length, clean, warning, failed, byCategory, warningRows, failedRows };
}
