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

## Session 3 additions (2026-09-03, after full-corpus validation)

28. **Output = per-Part PDF files by default.** A set: front-matter (title /
    overview / "The Parts" / abbreviations key / combined tag index) as one file,
    then one file per Part. Offer **"merge into a single PDF"** as an option for
    tablet reading. Each Part compiles well under any memory limit; the full
    single-pass compile needs ~3.5 GB (see docs/m3-validation.md) so per-Part is
    also what the browser generator must do.
29. **Mobile phone support is out of scope.** Desktop + iPad only. The bookmarklet
    (M5) works on both; "Android export" is dropped from the roadmap.
30. **A person's own words are never altered.** Notes and note titles render
    verbatim — no abbreviating, correcting, or reflowing. The only transformation
    is structural HTML → typeset (bold / italic / lists / links / paragraph
    breaks), which preserves meaning exactly.
31. **Scripture abbreviations: tag index only.** Official abbreviations from the
    quad (`Gen.`, `1 Cor.`, `D&C`, `Morm.`, `Abr.`, `JST Gen.`, …) — see
    src/scripture.ts. The abbreviation implies the volume, so no Part qualifier.
    Full names everywhere else (running heads, TOC, part titles). A one-page
    **abbreviations key** goes in the back matter before the tag index. *(key
    page: TODO)*
32. **TOC is per-Part, not one combined list.** Master file gets a short "The
    Parts" page (7 Parts + counts + Tag Index link). Each Part file opens with its
    own contents:
    - scripture: book subhead, then marked chapters wrapped ~10 per line, faint
      dot leader to the page where that line's chapters begin; every chapter a link.
    - GC: conference label, talks one per line ("Title · Speaker" + page).
    Chapter-level navigation is covered by the PDF bookmarks (Part→Book→Chapter)
    and the tag index.
33. **Headings & titles: Optima.** (Compared 10 faces against the Garamond body;
    the sans options jarred, Optima's flared humanist forms bridge cleanly.)
    Applied to: title page, part half-titles, section titles, TOC subheads,
    chapter headings, GC conference dividers, GC talk titles/bylines, running
    heads. Serif kept for body, notes (incl. note titles), tag names, margin
    ref headers. One `#let sans` for easy swap.
34. **Bug fixed:** `ckey`/`vkey` omitted the book, so `Genesis 1` / `Exodus 1` /
    `Leviticus 1` collided to one key and every book's chapter links + tag-index
    entries pointed at Genesis. Keys now include the book name.

35. **Name: "Their Testament"** (working name; final call still sits at the M7
    branding gate). Rationale: *testament* means both scripture (Old / New
    Testament) and a personal declaration of belief left to those who follow —
    the book is exactly that. Recognizable for what it does (someone else's
    marked scriptures), a little clever via the double meaning, and not
    shaped like an official Church product. Rejected: literary names (not
    recognizable — "Interleaf", "Marginalia", "Selah", …); anything containing
    "Gospel Library" (Church trademark → looks official/affiliated, which the
    user explicitly wants to avoid).
35a. The envelope `format` identifier is **`their-testament`** (matches the
    name). Changed from the pre-1.0 `gospel-library-preservation`, which is
    still accepted on read (warning) and normalised. Safe to rename now —
    nothing public consumes it yet. The npm package name is a separate,
    lower-stakes string; leave it until M7.

## M4 — stable `annotations.json` format (built, 2026-09-03)

Full spec: [annotations-format.md](annotations-format.md).

36. **Versioned envelope around the raw records.** `{ format:
    "their-testament", version: 1, exportedAt, source, counts,
    annotations: [ …raw Church v3 records… ] }`. The records keep the Church's
    exact shape — nothing renamed, flattened, or dropped; unknown/future fields
    round-trip untouched. `version` tracks only the envelope's own structure,
    never the Church's field changes.
37. **Validation: strict envelope + record identity, lenient on the rest.**
    Errors only for: bad `format`, unsupported `version`, `annotations` not an
    array, a record missing a string `annotationId`, a non-array
    `highlights`/`tags`/`folders`. Everything else is a warning — the generator's
    job is to survive messy records (M3: 99.08 % clean, rest reported), not the
    loader's to reject them.
38. **Bare legacy arrays still load** (wrapped as v1 + warning) so old dumps and
    raw dev-tools pastes work. Real envelopes preferred — only they carry
    `exportedAt` + `source`, which preservation needs.
39. Files: `src/envelope.ts` (browser-safe: types, `wrapAnnotations`,
    `validateEnvelope`, `readEnvelope`). Scripts: `check-export.ts` (validate +
    report), `wrap-export.ts` (bare → envelope), `_data.ts` (shared loader,
    prefers `export.json`). `validate.ts`/`build-job.ts`/`build-gc.ts` now read
    through the envelope; the validation report prints the export's
    version/date/source.

## M5 — annotation exporter (built, 2026-09-03) — see [m5-exporter.md](m5-exporter.md)

40. **Loader bookmarklet, not inlined.** The bookmark is a ~270-char stub that
    injects `https://theirtestament.org/e.js`. Confirmed safe: Church study
    pages send a CSP with only `frame-src` + `style-src` — no `script-src` /
    `default-src` — so injected external scripts run and same-origin Notes API
    `fetch` is unrestricted. Upside: `e.js` updates with no re-install
    (`?v=Date.now()` cache-bust).
41. **Exporter does annotations only.** Pages `annotationsWithMeta`
    (`setId=all&type=highlight,reference,journal&numberToReturn=1000`), dedupes
    by `annotationId`, wraps in a v1 envelope, downloads
    `their-testament-annotations-<date>.json`. Content fetching stays in M6.
    Runs entirely client-side; `e.js` is a static file, no backend.
42. **Full landing page now, generator drops in later.** `web/index.html` —
    hero with two sample "leaf" spreads (Psalm 23, Alma 32, invented notes; no
    real data), "what it keeps", how-it-works (bookmarklet), privacy, "why this
    exists", FAQ, footer disclaimer. Editorial / small-press look — warm cream +
    sienna, **Fraunces** display + **EB Garamond** body (self-hosted OFL,
    `web/fonts/`), dark mode, scroll reveals, `prefers-reduced-motion`. The M6
    generator drops into the same page/origin. Explicitly *not* the official
    Church aesthetic (no navy/gold, no crest, personal first-person voice,
    disclaimer in header + footer + FAQ).
43. **Deploy: git-repo → static host, host-driven** (not GitHub Actions /
    GitHub Pages — "directly from a git repository" meant repo-watched, the way
    the user's company site works). Connect a static host (Cloudflare Pages is
    the plan) to the repo: framework none, no build command, output dir `web/`;
    redeploys on push. `web/_headers` (Cloudflare/Netlify syntax) for font
    caching + security headers. Custom domain configured in the host dashboard,
    not a `CNAME` file. Repo `jlconlin/their-testament`; MIT `LICENSE`, root
    `README.md`.
44. Still to verify on the first live run (a real login): `start` index base,
    the exact response wrapper, iPad Safari install, rate-limit behaviour.
45. **`docs/m3-validation.md` and `docs/project-overview.md` hold aggregate
    stats about the family member's real annotation corpus** (counts, note-length
    distribution, year breakdown — no note text or verse lists). Scrubbed the one
    hard identifier (personId) from `annotations-format.md`. Before making the
    repo public, decide whether those two aggregate-stats docs stay or move to a
    git-ignored `docs/private/`.

### Open — must resolve before M6 (the browser generator)

- **Font licensing.** Body = Adobe Garamond Pro, headings = Optima — both
  commercial, cannot be served to the public by a browser app. Need SIL OFL
  replacements before M6 (EB Garamond is a near drop-in for the body; Optima
  has no clean OFL clone — pick a face or drop the contrasting heading font).
  The local/personal build may keep the real fonts, gated on context.
  *User wants to discuss separately — do not decide yet.*

### Domain / hosting (2026-09-03)

- **`theirtestament.org` registered (Squarespace, 2026-09-03).** `.com`/`.net`
  were also free; `.org` chosen as primary (reads least like an official
  product).
- Hosting: **static host watching the git repo** (Cloudflare Pages planned),
  output dir `web/`, no build step, redeploy on push. Serving static files is
  the only server-side thing in the whole design. Custom domain + TLS handled
  by the host; DNS at Squarespace (or moved to Cloudflare).
- The public site is a small **landing page** (what it is, sample spread,
  3 steps, privacy-first FAQ, visible "not affiliated with the Church"
  disclaimer, the bookmarklet) wrapped around the **M6 generator**. Not a
  new milestone.

### TODO (small, deferrable)
- Abbreviations key page in the back matter.
- `/PageMode /UseOutlines` post-process so the bookmark panel auto-opens.
- Highlights on chapter headings / summaries / talk kickers (~62 annotations) —
  parse those elements as annotatable units.
