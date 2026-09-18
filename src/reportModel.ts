// What the completeness report says, separated from how it is drawn.
//
// This used to live inline in index.html, welded to the DOM -- which meant the
// only way to see what a real export's report would say was to run a whole
// book through a browser. It is a pure function of the diagnostics now, so it
// can be run against a real export in Node and read.
//
// The rule it is written to: every fact appears once. A retired page's marks
// are counted where they belong (not in the book), and its notes are counted
// where they belong (kept in Miscellaneous) -- not re-described by a second
// line that only knows "a note couldn't be attached". And nothing here is
// phrased as a fault unless something actually went wrong.
import type { Diag, DiagCategory } from "./units.ts";
import type { DiagSummary } from "./diagSummary.ts";

/** Gospel Library's top-level URI segments, in words a reader would use. */
export const SOURCE_LABEL: Record<string, string> = {
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

export interface ReportInput {
  summary: DiagSummary;
  /** notes kept in Miscellaneous, all reasons */
  unplacedCount: number;
  /** ...of which are there because their page is no longer published */
  unplacedFromUnavailable: number;
  outOfScope?: {
    highlights: number;
    annotationsWithContent: number;
    bySource: [string, number][];
  };
}

export interface ReportRow { diag: Diag; level: "cat-warning" | "cat-failed" }

export interface ReportModel {
  headline: string;
  /** what did not make it into the book -- counts, stated as facts */
  left: string[];
  /** what did make it, but in a way worth a sentence */
  handled: string[];
  /** every row that is still worth inspecting */
  rows: ReportRow[];
}

const plural = (k: number, one: string, many: string) => (k === 1 ? one : many);
const num = (k: number) => k.toLocaleString("en-US");

/** "a", "a and b", "a, b, and c" */
function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`;
}

export function buildReportModel(input: ReportInput): ReportModel {
  const { summary, unplacedCount, unplacedFromUnavailable, outOfScope } = input;
  const n = (k: DiagCategory) => summary.byCategory[k] ?? 0;

  const gone = n("source-unavailable");
  const notShown = n("pid-no-match");           // the only genuine miss
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
  const headline =
    missing === 0
      ? `Everything you marked is in your book — all ${num(summary.total)} of them.`
      : missing / total < 0.05
        ? "Nearly everything you marked is in your book."
        : "Most of what you marked is in your book.";

  // ---- what is not in it -----------------------------------------------
  const left: string[] = [];
  if (gone) {
    const kept = unplacedFromUnavailable;
    left.push(
      `${num(gone)} ${plural(gone, "mark is", "marks are")} on pages or passages the Church no longer ` +
      `publishes — retired manuals, mostly. What they said can't be reproduced` +
      (kept
        ? `, but the ${num(kept)} ${plural(kept, "note", "notes")} you wrote on them ${plural(kept, "is", "are")} ` +
          `kept in Miscellaneous.`
        : `.`),
    );
  }
  if (outside) {
    const named = (outOfScope!.bySource ?? []).slice(0, 4)
      .map(([name, k]) => `${SOURCE_LABEL[name] ?? name} (${num(k)})`);
    const withContent = outOfScope!.annotationsWithContent ?? 0;
    left.push(
      `${num(outside)} ${plural(outside, "mark is", "marks are")} in sources Their Testament doesn't cover yet — ` +
      `${joinList(named)}` +
      (withContent ? `; ${num(withContent)} of them ${plural(withContent, "has", "have")} a note or tag of your own` : "") +
      `. Your export file keeps every one.`,
    );
  }
  if (notShown) {
    left.push(
      `${num(notShown)} ${plural(notShown, "highlight sits", "highlights sit")} on ` +
      `${plural(notShown, "a paragraph", "paragraphs")} this tool couldn't read, so ` +
      `${plural(notShown, "it isn't", "they aren't")} shown.`,
    );
  }

  // ---- what is in it, but worth a sentence -----------------------------
  const handled: string[] = [];
  if (whole) {
    handled.push(
      `${num(whole)} ${plural(whole, "verse is", "verses are")} marked in full, because the exact words you ` +
      `selected couldn't be pinned down.`,
    );
  }
  if (n("heading-highlight")) {
    const k = n("heading-highlight");
    handled.push(
      `${num(k)} ${plural(k, "highlight was", "highlights were")} on a chapter heading or summary. Where you ` +
      `marked words, those words are shown beneath the heading; where you chose no color, the tag or note ` +
      `carries on its own.`,
    );
  }
  if (n("chapter-note")) {
    const k = n("chapter-note");
    handled.push(
      `${num(k)} ${plural(k, "note", "notes")} written on a chapter heading ${plural(k, "sits", "sit")} at the ` +
      `top of that chapter.`,
    );
  }
  const elsewhere = Math.max(0, unplacedCount - unplacedFromUnavailable);
  if (elsewhere) {
    handled.push(
      `${num(elsewhere)} ${plural(elsewhere, "note couldn't", "notes couldn't")} be attached to a spot, so ` +
      `${plural(elsewhere, "it's", "they're")} kept in "Miscellaneous" near the back rather than dropped.`,
    );
  }

  // ---- the rows behind it ------------------------------------------------
  // Retired content is counted above, not listed: several hundred identical
  // rows of "no longer published", each with an annotation id nobody can act
  // on, would read as several hundred problems.
  const rows: ReportRow[] = [
    ...summary.warningRows.filter((d) => d.category !== "source-unavailable")
      .map((diag): ReportRow => ({ diag, level: "cat-warning" })),
    ...summary.failedRows.map((diag): ReportRow => ({ diag, level: "cat-failed" })),
  ];

  return { headline, left, handled, rows };
}
