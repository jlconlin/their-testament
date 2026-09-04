// Shared "how well did this reconstruct" classification -- one definition of
// clean/warning/failed, used by the CLI validator (scripts/validate.ts) and
// the browser generator's completeness report (M6) so they never disagree.
import type { Diag, DiagCategory } from "./units.ts";

export type DiagLevel = "clean" | "warning" | "failed";

export const FAIL_CATEGORIES: DiagCategory[] = ["pid-no-match", "empty-span", "note-no-anchor", "note-parse-empty"];
export const WARN_CATEGORIES: DiagCategory[] = ["whole-unit-fallback"];
export const OK_CATEGORIES: DiagCategory[] = ["located", "clear"];

export function diagLevel(category: DiagCategory): DiagLevel {
  if (FAIL_CATEGORIES.includes(category)) return "failed";
  if (WARN_CATEGORIES.includes(category)) return "warning";
  return "clean";
}

export interface DiagSummary {
  total: number;
  clean: number;
  warning: number;
  failed: number;
  byCategory: Partial<Record<DiagCategory, number>>;
  warningRows: Diag[];
  failedRows: Diag[];
}

/** No silent failure: every non-clean row is returned, not just counted. */
export function summarizeDiags(diags: Diag[]): DiagSummary {
  const byCategory: Partial<Record<DiagCategory, number>> = {};
  let clean = 0, warning = 0, failed = 0;
  const warningRows: Diag[] = [];
  const failedRows: Diag[] = [];
  for (const d of diags) {
    byCategory[d.category] = (byCategory[d.category] ?? 0) + 1;
    const level = diagLevel(d.category);
    if (level === "clean") clean++;
    else if (level === "warning") { warning++; warningRows.push(d); }
    else { failed++; failedRows.push(d); }
  }
  return { total: diags.length, clean, warning, failed, byCategory, warningRows, failedRows };
}
