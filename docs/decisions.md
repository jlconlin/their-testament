# Decisions log

Numbered to match the grilling. "flag" = a config toggle, not hard-coded.

## Product
1. Keepsake *about* the person (primary); gift *to* them (secondary).
2. Dip-in reference, organized by source in canonical order; light back-matter indexes.
3. Sources: Scripture + General Conference now. `sources.*` flags; manuals/magazines later.
12. Output = fixed-layout color **PDF**, 6x9, mirrored margins. Tablet-first; also printable/bindable.
    Tappable TOC + indexes.
13. Engine: **Typst** (browser-viable via WASM; tiny binary; fast; JSON-native).
    Bake-off confirmed parity with LaTeX.
    Delivery (tentative): hosted static page, all computation client-side, public tool,
    pipeline in TypeScript.

## Scripture presentation
4. Every highlighted verse in (bare highlights included). Threshold is a flag.
5. Highlighted verses only, in chapter context; skipped verses = gaps in numbering.
6. Single column ~3.3in, wide outer margin ~1.5in for notes; verse-per-block, hanging indent.
6b. Margin side is a GENERATION-TIME FLAG. Internal values `fixed` | `mirrored`, but the
    UI must present it as **"Reading on a screen"** vs **"Printing & binding"** --
    "fixed/mirrored" means nothing to most people.
7. Full verse shown, exact word-span marked; multi-span per verse; whole-verse fallback + validator.
8. Minimal apparatus (headings + verse text only). `include.chapter_summaries` etc flags, default off.
9. Tags: glyph + names in margin (flag to suppress names).
9b. ONE combined tag index at the very back (not per-part), all tags. Locators are
    scripture references ("Job 1:20"), hyperlinked to the verse. No page numbers.
14. Fill = opaque tint; underline = colored rule (real Gospel Library palette, see typeset/palette.md).
    `clear` = no visual mark, note/tag only.
15. Long-note spill: **flow** down the margin (never split/shrink).
18. Next verse vs prior note: **soft (b)** -- a note may run beside following verses that have no
    note of their own; a following *noted* verse waits. Bound the overhang (c) if it runs absurdly far.
19. Non-contiguous verses: extra whitespace + a small gray centered ... (no rule).
20. Legend/meta notes ("orange = ..."): treated like any other note. No lifting to a chapter epigraph.
21. Both `reference` and `journal` entries are IN (flags, default on).
21a. `journal` (19, no verse anchor): own chronological section at the back, "Study Notebook(s)".
21b. `reference` (190): render exactly like regular personal notes -- no visual distinction.
     (The `type:"reference"` field identifies them if we ever reconsider.)
    Each note carries a verse-ref header styled to echo its highlight (color + fill/underline).

## General Conference
10-11. Year -> conference -> talk -> paragraphs, parallel to scripture. Talk heading + running head.
    "..." for skipped paragraphs. Narrower measure than scripture. Every highlighted paragraph in (flag).

## Structure
22. One PDF with labeled **Parts**; flag to export any single Part alone for printing.
    Page numbers **restart per Part**. Index/cross-ref locations are Part-qualified
    ("Alma 32:21 - Book of Mormon p. 214").
    Parts (7): Old Testament / New Testament / Book of Mormon / Doctrine & Covenants /
    Pearl of Great Price / General Conference / Study Notebook(s).
    Stragglers (JST x8, Family Proclamation x4, Bible Dictionary x2, Guide to Scriptures x2):
    fold into nearest Part or a catch-all, decide later. Manuals/magazines: place when added.

23. Front matter (uses full page width, symmetric margins -- no notes there): title page (title default "The Marked Scriptures of ___", + name + date);
    auto stats/overview page (date range, counts, top tags); optional user-written preface;
    detailed TOC (Parts -> books -> chapters with content).
    Back matter: tag index (all 644, Part-qualified); colophon (generated-from / date / Typst / tool).
    NO separate scripture reference index (the TOC + by-source order covers it).
    (User may revise once the web UI exists.)

## Notes rendering
24. Keep all structure -- bold, italic, lists, blockquotes. Links -> citation text with thin
    underline; live PDF hyperlink when target is churchofjesuschrist.org; dayone:// -> text only.
    Small HTML->Typst converter in the pipeline.
25. Multi-note verse disambiguation: (c) notes stack in reading order of their spans, AND
    (b) letter suffixes -- "1:15a / 1:15b" in the ref header + a faint gray superscript a/b at
    each span's start in the verse. Applied to every verse with 2+ notes (assumed; confirm).

## Engineering
26. Scripture/GC text: fetch live from the Church content API per run, cache in the browser
    (IndexedDB). Zero corpus bundled. First run per person is network-heavy (~1,600 chapters
    + their GC talks) with a progress bar; later runs fetch only changes.

## Deferred
16. Auth -- how a visitor gets their annotations into the page, no server, not phishing-shaped.

## Still open
- GC layout specifics (heading format, running-head level, excerpt context rule) -- vs a GC prototype
- Web-app architecture (partly waits on 16)
- Prototype "definition of done" (Q27)

## What "flag" means
A config value (YAML now; checkboxes in the web tool) with the chosen answer as its default.
Nothing in the pipeline changes to flip one.

## Build plan
27. Milestone 1 = complete OT Part, **Job only**, as a real PDF:
    all 11 marked chapters (43 annotations), live fetch + disk cache, part title page,
    chapter headings, running heads, per-Part page numbers, every rendering decision above,
    the Job tag index, an offset-validation report. Run via script (not the web UI).
    M2 = one GC conference (settle GC layout). M3 = web UI + auth. M4 = scale to everything.
    Pipeline language: **TypeScript** from here (ships to the browser later); Typst via CLI now,
    typst.ts (WASM) at M3.

## M1 v2 (built)
- Nested PDF bookmarks: Part > Book > Chapter, plus top-level Tag Index.
- TOC + tag index hyperlinked (no underline). Per-Part page numbers.
- Chapters flow (no forced page break); chapter heading kept with verse 1.
- "Chapter N" headings; verse numbers de-emphasised.
- `margins: fixed|mirrored` flag implemented (env MARGINS= for now).
- Pipeline: TS modules in src/, `npm run build:job`, template templates/book.typ.
- TODO polish: verse-number weight, title, GC, mirrored gutter fine-tuning.

## M2 — General Conference (built)
- Part > Conference ("April 2015") > Talk. Bookmarks + TOC nested to match.
- Talk heading: title / By [speaker] / [role]. No kicker. No date line.
- Paragraphs: prose, JUSTIFIED, with a small leading **paragraph number** styled like
  verse numbers (recent talks are cited by paragraph). Full paragraph shown even when
  only a phrase is marked (decision 11 stands).
- Note ref header on GC = "¶ N" (or "¶ N–M" for a range), echoing the highlight.
- GC measure = scripture measure (equal for now).
- TOC talk lines: "Title · Speaker".
- Combined tag index. GC locator = **"A-15, Bednar, p. 27"** (conf letter + 2-digit year +
  surname + PART-RELATIVE PAGE number), hyperlinked to the paragraph, duplicates collapsed.
  Scripture stays "Job 1:20" (the reference is the locator; no page).
- Running head when two talks share a page: shows the talk that STARTS on the page.
- Pipeline: src/talk.ts, src/assembleGC.ts, src/units.ts (shared verse/paragraph core),
  scripts/build-gc.ts.
- TOC compacted (M2 revision). Polish TODO: collapse repeated "A 15 ·" within one tag; lining figures
  in index; first shown paragraph indent.

## TOC / index page numbers (M2 revision)
- Tag index GC entries point to a PAGE number (part-relative), not a paragraph number.
- TOC has right-justified part-relative page numbers: scripture BOOK lines, and GC TALK lines.
  (Scripture chapter numbers stay as an inline hyperlinked list, no per-chapter page.)

## Revised milestone sequence (after external review, 2026-09-03)

The review's core point: the prototype proved the *concept*; it has not proven
*scale*. Retire technical uncertainty on the full ~19,900-annotation corpus
before building the public interface.

Adopted principles:
- **Export ≠ generation.** The bookmarklet is an annotation *export utility*.
  The generator's only contract: "given a valid export file, make the book."
- **`annotations.json` is a first-class, versioned interchange + preservation
  format** — documented schema, validation, unknown fields preserved. The JSON
  is the durable machine artifact; the PDF is the readable one. Offer both.
- **Observable completeness.** Every run emits a completion report (included /
  included-with-warnings / failed, by category); the affected annotations are
  inspectable. No silent failure.
- **Copyright + API-terms = a formal public-release gate** (not blocking
  engineering or personal use).

| # | Milestone | Exit criterion |
|---|---|---|
| **M3** | Full-corpus validation | Every failure class understood + documented; size/time/memory measured; Typst-WASM stress-tested |
| **M4** | Stable `annotations.json` format | Generator accepts a documented, versioned input independent of acquisition method |
| **M5** | Bookmarklet / exporter | A normal user can obtain a valid export without dev tools |
| **M6** | Browser generator | Upload → options → generate → completeness report → download, all in-browser |
| **M7** | Public-release readiness | Copyright/terms review, privacy, docs, compat, naming, versioning, support |
| **M8** | Optional expansion | Browser extension, Android export, CLI, more content types, preservation archive |

Settled, not to be reopened without a concrete problem: Typst; TypeScript;
local-first; canonical organization; original highlighting; margin notes; tag
index; bookmarks + hyperlinks; bookmarklet before extension; export/generation
split.
