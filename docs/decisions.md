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
    single-pass compile needs ~3.5 GB (measured on the full-corpus run) so
    per-Part is also what the browser generator must do.
29. **Mobile phone support is out of scope.** Desktop + iPad only. The bookmarklet
    (M5) works on both; "Android export" is dropped from the roadmap.
    **Amended 2026-09-05: iPad is not a requirement for *making* a book.**
    Treating it as one was a mistake. The tool — bookmarklet *and* generator —
    is desktop-first; working on an iPad is welcome but never a constraint on
    a design choice. Two reasons it was wrong: installing a bookmarklet on
    iPad Safari means adding a bookmark and then editing its URL to paste
    `javascript:` (the worst path in the product), and generation now peaks
    around 1.0 GB of wasm per piece, which iPadOS Safari is unlikely to allow
    and quick to kill a tab over. **Decision 12 is untouched** — the PDF is
    still tablet-first *to read*, which is the thing the iPad is actually for
    here.
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
45. **Public repo = `jlconlin/their-testament`.** Kept out of it, on purpose:
    `data/raw/` + `data/cache/` (always gitignored); `docs/private/` — the M3
    validation write-up and the old project-overview doc, which carry aggregate
    stats about the real corpus (counts, note-length distribution). Git history
    was rewritten before the first push to scrub a Church account ID and the
    sample record IDs from `annotations-format.md`, and to drop the two
    `docs/private/` files entirely.

### Font licensing — resolved (2026-09-04)

Body = Adobe Garamond Pro, headings = Optima were both commercial and
couldn't be served to the public by a browser app — this was the one
blocker that had to resolve before M6 (the browser generator) could go
live. Considered and rejected as a general solution: the browser's **Local
Font Access API** (`window.queryLocalFonts()`) could let the generator use
a visitor's own installed Adobe Garamond Pro/Optima, if they happen to have
it — but it's Chromium-only (no Safari/Firefox), permission-gated, and
legally ambiguous (reading a commercial font's bytes into a web page, even
locally, isn't clearly covered by every font's EULA). At best a future
progressive enhancement layered on a real OFL default, never a substitute
for choosing one.

Built `typeset/heading-font-comparison-ofl.typ` — same mini-layout as the
original commercial-font `heading-specimen.typ`, but body fixed to EB
Garamond and 11 OFL-only heading candidates: dropping the contrasting font
entirely (EB Garamond, tracked caps), three serifs in the body's own family
lineage (Fraunces, Spectral, Cormorant Garamond), and seven sans options
spanning geometric to humanist (Jost, Montserrat, Nunito Sans, Libre
Franklin, Barlow, Public Sans, Questrial). Compiled and visually verified
(real glyphs, no font-fallback warnings) against font files pulled from
google/fonts's OFL directory; PDF sent to the user for review.

**Decision: Fraunces for headings, EB Garamond for the body** — both
already the site's own web fonts (`web/fonts/`), so one license pair covers
the whole product, and the book now shares a visual identity with the
landing page instead of two unrelated typefaces. Optima dropped entirely,
no fallback-font compromise needed.

Implemented everywhere, not just decided:
- `templates/book.typ`: `sans = "Fraunces"` (was `"Optima"`), body
  `#set text(font: "EB Garamond", ...)` (was `"Adobe Garamond Pro"`).
- Real `.ttf` files (the full variable fonts from google/fonts — Typst
  needs raw sfnt, not woff2) added to `web/fonts/`: `Fraunces.ttf`,
  `Fraunces-Italic.ttf`, `EBGaramond.ttf`, `EBGaramond-Italic.ttf`. Already
  covered by the existing `LICENSE-Fraunces.txt`/`LICENSE-EBGaramond.txt`
  (same families, just a different file format).
- Node CLI (`src/render.ts`): `--font-path` now includes the project's own
  `web/fonts/` alongside `~/Library/Fonts`, so a fresh clone renders
  correctly with no font install step (personal path still checked first,
  in case someone wants to override).
- Browser (`generate.html`/`browserRender.ts`): the four `.ttf` files are
  now passed to typst.ts's `loadFonts()` as self-hosted relative URLs
  (`./fonts/...`) — no dependency on typst.ts's own bundled defaults, no
  third-party font CDN.

Verified both paths for real, not just typechecked: `scripts/build-sample.ts`
recompiled cleanly and visually confirmed Fraunces/EB Garamond glyphs in the
output; the browser path was run through the actual page UI and the
resulting PDF's embedded font subsets read `Fraunces-9ptBlack`,
`EBGaramond-Regular`, `EBGaramond-Italic` — the real fonts, not a fallback.

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

## M7 — Church permissions request submitted (2026-09-04)

**Request #L26-64433 submitted to the Church Intellectual Property Office**
via permissions.churchofjesuschrist.org. Response expected within ~45 days
(by approximately 2026-10-24, the availability date given in the request).

Covers two content items:
- **Scriptures** — scriptural text only (no section headings, footnotes, or
  study helps) across all five volumes (OT, NT, BoM, D&C, PGP); a portion of
  the Standard Works (only user-marked verses, not the complete text); online
  edition, text format.
- **General Conference talks** — Text/Quotation, any speaker, paragraphs the
  user personally marked.

Key framing decisions made while filling out the request:
- **Distribution method: "Other" only** — not "Printed Publication" and not
  "Website/blog." Their Testament distributes a web tool; a user's own choice
  to print their personal PDF (through a print shop of their choice) is their
  separate, downstream action, not something the project itself publishes or
  distributes. Corrected mid-session after initially (incorrectly) checking
  "Printed Publication → Book."
- **AI use disclosed honestly**: Claude (Anthropic) was used as a coding
  assistant to help build the site and pipeline; explicitly noted that no
  Church-owned content is AI-generated, AI-altered, or AI-processed at
  runtime — scripture/talk text is retrieved verbatim, notes are the user's
  own unedited words.
- **Available worldwide, all languages** — not restricted to English; the
  tool adapts to whatever language the user's own account/content is in.
- Available for the **life of the product**, free (no charge), no
  publisher/producer/distributor involved.
- Attached a **synthetic sample PDF** (Psalm 23 + Alma 32, invented margin
  notes, no real family data) generated by the actual pipeline
  (`scripts/build-sample.ts`) so the reviewer can see real typeset output.

Known quirk hit while filling out the form: the Church's permissions portal
silently caps several free-text fields at 500 characters (no visible limit
until you exceed it — text gets truncated mid-word) and its own
"required fields" banner is unreliable/stale until a fresh page load. A hard
reload was the only reliable way to see the true validation state.

One open question surfaced and not fully resolved: once "Printed content or
physical object" is unchecked on the "Permission Needed" page (to match the
"Other only" distribution framing), the form removes its nested "Who will use
the requested Church-owned items? → Available to others" checkbox — there's
no other field on that page that states the tool is public rather than
personal-only. Left as-is; the public/available-to-others framing is already
stated in the free-text answers (Content Requests and Product/Project
description).

## M8 — Site analytics + protected contact form (planned, not started)

Two additions to the live site, decided but deferred:

- **Analytics**: Cloudflare Web Analytics (free, cookie-less, no consent
  banner needed since it's already the site's host). Needs the site added
  under Analytics & Logs → Web Analytics in the Cloudflare dashboard to get a
  beacon token, then one script tag added to `web/index.html`.
- **Contact form**: a form on the site, protected by Cloudflare Turnstile
  (blocks bots without a user-facing CAPTCHA), backed by a small Worker
  endpoint that emails submissions via Cloudflare Email Routing — no
  third-party form service, no publicly exposed email address. Rejected
  alternatives: a plain `mailto:` link (doesn't stop spam once the address is
  guessable) and a third-party form service like Formspree (adds a dependency
  on another company routing the messages).

Needs before starting: Email Routing enabled on the domain with a verified
destination address, and a Turnstile site/secret key pair from the dashboard
(both dashboard steps only the account owner can do). Code-side, this also
means adding a `main` Worker entry point alongside the existing
`assets` binding in `wrangler.jsonc`, which is currently assets-only.

## M6 scaffolding started (2026-09-04)

First working slice of the in-browser generator — upload an export, get a
real PDF, entirely client-side. Not linked from the public site yet
(`web/generate.html` is reachable directly but has no nav link); still
default (non-final) fonts pending the M5 font-licensing blocker above.

- **Typst compiles via WASM, loaded from jsdelivr, no bundler.** Confirmed
  by hand (`web/_typst-wasm-test.html`, gitignored) that
  `@myriaddreamin/typst.ts`'s plain package export can't be loaded directly
  from a CDN: its internal `import('@myriaddreamin/typst-ts-web-compiler')`
  is a bare specifier that jsdelivr won't resolve, and esm.sh's rewrite trips
  on that package's Node.js-fallback branch (`Failed to resolve module
  specifier 'fs'`). The fix: import typst.ts's own pre-bundled browser build
  (`dist/esm/contrib/all-in-one-lite.bundle.js`, self-contained, no bare
  specifiers) and pass `getModule` explicitly pointing at the compiler
  wasm's own jsdelivr URL, since the bundle's default relative WASM lookup
  assumes it's colocated with that separate package. Also: `compile({format:
  'pdf'})` silently compiles to the *vector* format instead — the string
  isn't recognized; `CompileFormatEnum.pdf` isn't exported from the lite
  bundle either, so the code uses the enum's stable numeric value (`1`)
  directly, documented in `src/browserRender.ts`.
- **`ContentSource` interface extracted** (`src/types.ts`) so the assembler
  doesn't care whether it's talking to the Node dev client (disk cache,
  `src/contentApi.ts`) or the new browser one (IndexedDB,
  `src/browserContent.ts`) — same `.get()`/`.tryGet()` contract, swapped by
  the caller.
- **`src/assembleBook.ts`**: the "classify every annotation → assemble every
  Part → build the DocBook" logic (steps 1–4 of `scripts/validate.ts`)
  pulled out into a shared, portable function so the browser generator isn't
  a second copy of it. `validate.ts` itself was left as-is (its extra
  reporting bookkeeping — out-of-scope-by-source counts, per-book progress
  lines — is diagnostic-script-only and not worth threading through a
  production function); a small amount of duplication between the two is an
  accepted tradeoff, not an oversight.
- **Reusing the TypeScript pipeline in the browser needs one transpile
  step**, `npm run build:web-pipeline` (`tsc -p tsconfig.web.json`, then
  copies `templates/book.typ` to `web/gen/book.typ`) — plain per-file ESM
  output, no bundling/minification, TS 5.9's `rewriteRelativeImportExtensions`
  handles the `./foo.ts` → `./foo.js` rewrite. `web/gen/` is committed (like
  `web/bookmarklet.txt`), regenerated by hand before pushing, the same
  convention as `scripts/build-bookmarklet.ts` — no Cloudflare build step
  added.
- **`node-html-parser` (used by `verses.ts`/`talk.ts`/`noteHtml.ts`) is a
  bare npm specifier** the browser can't resolve on its own; `generate.html`
  carries a one-entry `<script type="importmap">` pointing it at its own
  jsdelivr-hosted ESM build (self-contained, no further bare imports to
  resolve).
- Verified end to end with a synthetic export (fabricated pids, not real
  annotation data) run through the actual page code in a live browser: file
  → envelope → IndexedDB-cached content fetch → assembled DocBook → compiled
  PDF (`%PDF-` magic, real byte count). The synthetic pids didn't match real
  paragraph ids (expected — they were invented), so the scripture Part came
  back empty; that's a test-data artifact, not a pipeline defect — the
  front-matter still compiled correctly around it.

Still missing for M6 proper: per-Part output packaging (deliberately
deferred — see below), and a nav link once it's actually ready for a
visitor.

### Per-Part output packaging (deferred, 2026-09-04)

Read `templates/book.typ` in full to scope this and found a real conflict,
not just missing plumbing: the tag index and "The Parts" overview page work
by hyperlinking directly into the *same* compiled document — Typst's
`query()`/`context` resolve those page locations across the whole book in
one pass. That single pass is exactly what M3 measured at ~3.5 GB. Splitting
into separate per-Part compiles (to bound memory, as decision #28 originally
proposed) breaks those hyperlinks, because a PDF can't natively jump into a
page of a *different* PDF file the way it can within itself — so "per-Part
output" isn't just a packaging question, it's a real tradeoff in the
finished book (either the tag index stops being clickable, or merging pages
back into one file needs its own hyperlink-rewriting step).

Decision: **ship single-pass only for now.** Most real corpora are far
smaller than M3's ~19,900-annotation stress case; this becomes a real
problem only for very large exports, at which point the browser tab likely
runs out of WASM memory outright (the existing generic try/catch in
`generate.html` at least surfaces that as a visible error rather than a
silent hang). Revisit if/when it actually happens to someone, rather than
degrading the tag index's hyperlinks for everyone up front. If it does need
solving later, the options considered were: (a) separate PDFs per Part with
a plain-text (non-linked) tag index, or (b) compile separately then merge
pages into one PDF, still without cross-links (rewriting PDF-internal link
destinations across merged files is real added engineering, not attempted).

With this, M6's scaffolding pass is functionally complete for a
normal-sized export: upload → progress → assemble → options → compile →
completeness report → download, all verified live in a browser. Remaining
before this is public: a nav link, and (still parked, unrelated to this
work) the font-licensing decision above.

### Per-Part packaging — revisited and implemented (2026-09-05)

"Revisit if/when it actually happens to someone" (above) happened on the
first real test against the user's own full export (19,872 annotations,
~17,900 marked units): single-pass compile crashed reliably in Chrome —
`RuntimeError: unreachable`, a wall of raw `wasm-function[N]` frames, no
symbols. Diagnosed properly before building anything:

- **It's a WASM call-stack limit, not the heap.** Parsed the compiler's own
  `.wasm` binary — its Memory section declares no maximum, so it can grow;
  the crash is Typst's layout recursion overrunning the WASM module's fixed
  call stack (set at build time by the `typst-ts-web-compiler` project,
  not configurable from our JS).
- **Confirmed environment-specific, not data-specific.** The exact same
  real `DocBook` compiled successfully in Node (30s, real 3.95 MB PDF) using
  the identical WASM binary — so it's not that the document is "too big,"
  full stop. A synthetic document at the *same scale* also succeeded
  earlier, ruling out raw verse count as the sole predictor. Re-ran the real
  document in a completely fresh Chrome tab (ruling out "memory pressure
  from other tabs") — it crashed again, with the *identical* stack trace
  (same function offsets, same order) both times. Chrome's renderer
  evidently gives WASM a smaller stack than Node's process does, and this
  document's layout recursion sits right past that line.
- Considered rebuilding `typst-ts-web-compiler` from source with a bigger
  linker-configured stack (would fix this without any of the below, and
  without ever sacrificing hyperlinks) but rejected for now: it means taking
  on a Rust + wasm-pack build toolchain this project doesn't have at all,
  a heavier and different kind of complexity than anything else here.

Implementation (`templates/book.typ` gained a `mode` input — `"full"`
default/CLI, `"front"`, `"part"`, `"back"` — plus `src/browserRender.ts`,
`src/mergePdf.ts`):

- **Front / one-per-Part / back**, not front / one-per-Part like the
  original deferred plan — unplaced-notes + tag index were originally
  folded into "front," which put them right after the title page once
  concatenated instead of at the true end of the book (caught from the
  first real merged output). They're their own `"back"` mode now, merged
  last.
- **The split is a fallback, not a default** (`renderBookAuto`): try the
  normal single-pass compile first, and only split if that throws. Small
  personal books get the fully-linked one-pass result (better — the tag
  index and "The Parts" list stay clickable); only the ones that actually
  can't fit the WASM stack pay the split's cost. No size threshold to guess
  at — verse count already proved to be an unreliable predictor above, so
  trying is more honest than estimating.
- **The split pieces are joined into one downloaded file, not left as a
  dozen separate links** — the first working version returned front +
  8 Parts + back as separate downloads; the user's reaction ("having a
  dozen links is not very helpful") was fair, and simple page concatenation
  (`mergePdfs` in `src/mergePdf.ts`, via `pdf-lib` loaded from jsdelivr, same
  CDN-no-bundler pattern as typst.ts) covers it.
- **PDF bookmarks survive the join.** `pdf-lib`'s `copyPages()` copies page
  content but drops each source's `/Outlines` tree — a real, separate loss
  the user caught immediately after the first merge shipped ("no bookmarks
  at all... there's got to be a way"). `pdf-lib` has no built-in
  outline/bookmark API (confirmed: its own `copy()` docstring calls this
  out — "won't copy... outlines"), but does publicly export the low-level
  PDF primitives (`PDFDict`, `PDFName`, `PDFRef`, `PDFArray`, `PDFString`,
  `PDFHexString`, `PDFNumber`) needed to read and rebuild one by hand — a
  documented, if unsweetened, part of its API, not a hack into internals.
  `mergePdf.ts` walks each source's existing outline tree (Typst already
  builds these correctly and nested — Part > Book > Chapter — per the
  settled "bookmarks + hyperlinks" decision), remaps each item's target
  page by position (`copyPages` preserves page order, so a source's local
  page *N* is the *N*th page it contributed to the merged doc), and grafts
  the rebuilt trees together as siblings in the new document's `/Outlines`.
  Verified against the user's real compiled output with `pypdf`: all 1,718
  outline entries across the full 1,678-page merged book, correctly nested,
  every page target correct, ending with "Notes We Couldn't Place" and
  "Tag Index" at the true end.
- Confirmed real (not synthetic) end-to-end twice more after the fix: the
  full real export split-compiled and merged cleanly with no crash, in the
  same browser context that had crashed on the first attempt.

### The above diagnosis was wrong — measured properly (2026-09-05)

The split kept failing intermittently, so the crash was instrumented instead
of reasoned about: the real compiler was run against the real book in Node
with `WebAssembly.Memory` growth sampled throughout.

- **It's memory, not the call stack.** The full book peaks at **4.20 GB —
  64,088 of the 65,536 wasm32 pages** — and dies there. `memory.grow` fails
  at the 4 GiB address-space ceiling, Rust's allocation-error handler calls
  `abort`, and `abort` compiles to the wasm `unreachable` instruction. The
  trap that looked like a stack overflow *is an out-of-memory abort*. The
  earlier reasoning ("the Memory section declares no maximum, so it can
  grow") was true and irrelevant: growth is capped by the 32-bit address
  space regardless of what the module declares.
- **There is a second, independent wall.** Relieve the memory pressure and
  the compile gets further, then dies with a genuine
  `RangeError: Maximum call stack size exceeded` at 3.22 GB. So one pass on
  a book this size can't be rescued by saving memory alone — which is what
  finally justified investing in the split rather than treating it as a
  stopgap.
- **The running header was quadratic.** It ran two full-document `query()`
  scans *per page*: 1,560 `<rh>` markers x 1,678 pages ≈ 2.6M introspector
  lookups per layout pass. Query results come back in document order, so a
  binary search finds the same element — verified page-by-page against the
  old code, including the case where a chapter starts mid-page (where
  Typst's own documented `.before(here())` idiom silently differs, so it
  was *not* used). Same fix in miniature for the per-Part contents page,
  which re-filtered every `<cm>` once per line. Result on the full real
  book: peak **4.20 GB → 2.32 GB**, native CLI **20.0s → 9.7s**, and the
  extracted text of all 1,684 pages byte-identical to before.
- **`createTypstCompiler()` does not give you a fresh heap.** Ten "fresh"
  compilers created **2** wasm instances — typst.ts reuses one per realm,
  and wasm linear memory never shrinks. So the Part-by-Part path cost the
  *sum* of the pieces' peaks, finishing at **3.72 GB**, within 0.5 GB of the
  ceiling that kills the single pass. That, not bad luck, is why it was
  flaky. **Terminating a Worker is the only thing that actually frees the
  memory**, so every piece now compiles in its own Worker that is terminated
  as soon as it answers, and peak becomes the cost of the largest single
  piece.
- **Pieces are bisected on failure.** Parts are wildly uneven (649
  conference talks in one, 5 chapters in another); "one chunk per Part" is
  no guarantee any chunk fits. A piece that fails is halved and retried.

### Cross-file links restored in split builds (2026-09-05)

The split used to downgrade the tag index and the Parts list to plain text,
because a PDF can't link into a different PDF. It doesn't have to stay that
way once the pieces are in one file: every target emits an invisible link
annotation with an unknown URI scheme (`ttdef://<key>`), every reference
emits `ttref://<key>`, and `mergePdf.ts` resolves each reference to the page
its anchor landed on, then strips the anchors. Typst passes unknown schemes
through verbatim and `copyPages` preserves annotations, which is what makes
link annotations usable as a data channel — the one machine-readable thing
that survives both PDF export and the merge.

Because the back matter compiles *after* every Part, their lengths are known
by then, so the page map is fed back in and the tag index prints **true book
page numbers** instead of the per-Part relative ones it used to show. The
front matter is then recompiled with the finished map so its Parts list
links too (kept only if its page count didn't move, since the offsets were
measured from the first version).

This also caught a pre-existing bug in the merge: `copyPages` carries link
annotations across but re-points their `/Dest` at a *duplicate* of the
target page that never enters the page tree, so all 2,221 of Typst's own
in-document links (every per-Part contents page) were dead in merged output.
Targets are now recorded by position before the copy and re-pointed after,
the same remap the outline tree already needed.

Verified on the real book: 1,683 pages, 5,673 cross-file jumps and 2,221
internal links all resolving inside the document, zero unresolved or
leftover markers, all 1,718 outline entries intact, and spot-checked page
numbers landing on the right talk (tag index "O-23, Wright, p. 1421" → page
1421 is Amy A. Wright's "Abide the Day in Christ" from October 2023).

### Pieces are sized up front, not discovered by failing (2026-09-05)

Annotations only grow, so the split was tested at 2x and 4x the real book
(synthesised by repeating Parts) and, separately, against the growth pattern
that actually matters. Scripture Parts are bounded by the size of the canon;
**General Conference is not** — two conferences a year, forever — so the
realistic long-term shape is one Part growing without limit, which repeating
Parts does not exercise at all.

- **Per-piece memory is flat.** 1x / 2x / 4x → 1,683 / 3,348 / 6,678 pages,
  and the worst single piece stayed at ~1.0 GB throughout, because the split
  grows the *number* of pieces rather than their size. All links held: at 4x,
  16,189 cross-file jumps and 8,884 internal links, zero broken.
- **For one oversized Part, the binding wall is the call stack, not memory.**
  A 2,596-talk Conference Part failed with a layout-recursion
  `RangeError` at 3.90 GB; halving it to 1,298 talks still failed, at
  **~1.9 GB — less than half the 4.29 GB memory ceiling**. Only at 649 talks
  (~1.0 GB) did it compile. So memory headroom badly overstates how large a
  piece may be, and unit count -- which tracks recursion depth -- is the
  honest measure.
- **Discovery by failure had become the dominant cost.** On that book, the
  doomed one-pass attempt plus three failed Part compiles burned **78% of
  total wall time**, and every such attempt gets slower as books grow.

So pieces are now planned before anything is compiled: `PIECE_UNIT_CAP =
4000` units (verses / conference paragraphs / notebook entries), halving a
Part until each piece is under it. The cap comes from the measurements above
(3,609 units compiles in 14s; 7,218 dies), and it never fires on scripture —
Book of Mormon is 1,581 units. Bisection stays as the safety net for anything
the plan misjudges. One pass is likewise attempted only when the whole book
would fit in a single piece, since below that the attempt is quick and the
payoff is a fully clickable book with no merge at all.

Result, with identical output (extracted text byte-for-byte the same as the
bisected build, same 5,673 + 2,221 links, same 3,857 bookmarks):

| book | before | after |
| --- | --- | --- |
| real | ~2.7 min | **0.7 min** |
| 4x General Conference | 7.4 min | **1.6 min** |

### Friendly failure messages (added 2026-09-04)

A failure used to just dump `FAILED: ${e.stack}` into the log — not
actionable for a real visitor. `generate.html` now tracks which stage
failed (`reading` / `assembling` / `compiling`) and shows a plain-language
message + reassurance ("nothing was lost — this all happens on your
device") tailored to that stage, with the raw stack tucked behind a
`<details>` for anyone who needs it. Verified both paths live: an invalid
JSON file produces the "doesn't look like a valid export" message; a valid
file still completes normally afterward (no regression from the added
stage-tracking).

### "Notes We Couldn't Place" appendix (added 2026-09-04)

Prompted by a direct question: "what can we do for those that fail?" Not
every failure category is recoverable — `pid-no-match` means the annotation
points at content that's genuinely moved or changed, nothing client-side
fixes that. But `note-no-anchor` was worse than unrecoverable: it was
**silently discarding the person's own note text** along with the highlight
that failed to resolve, which conflicts with decision #30 ("a person's own
words are never altered" — dropping them entirely is a harder violation
than altering them).

Fix, threaded through the whole pipeline:
- `src/units.ts`'s `assembleUnits` now parses the note body even when no
  highlight resolves, and — if there's real content (title, body, or tags)
  — returns it as an `UnplacedNote` instead of just recording a diagnostic
  and discarding it.
- `src/assemble.ts` (`BookResult`) and `src/assembleGC.ts` propagate these
  up; `src/assembleBook.ts` collects them into a new `DocBook.unplacedNotes`
  field. `scripts/validate.ts` — which duplicates assembleBook's
  orchestration (see the M6-scaffolding note above) — was updated in
  parallel so the CLI path doesn't regress relative to the browser one on
  this specific data-loss question; also added a count to its text report.
- `templates/book.typ` renders a new back-matter section, "Notes We
  Couldn't Place", right before the tag index — reuses the same
  title/body/tags layout as the notebooks part. Linked from the "The Parts"
  front-matter page like the tag index already is.
- `generate.html`'s completeness report now translates category codes into
  plain language ("couldn't find this verse/paragraph (the page may have
  changed since this was marked)" instead of `pid-no-match`) and calls out
  the unplaced-note count with a pointer to where they ended up.

Verified live: the same synthetic export's two fabricated-pid annotations
(each carrying a real note) now show up in the compiled PDF — byte count
jumped from 17,780 to 28,370 for the same input, confirming the appendix
section actually rendered, not just that the data reached the template.

### Progress indicator (added 2026-09-04)

`ContentClientBrowser` takes an optional `onProgress` callback (fired after
every fetch, cache hit, or failure) — `generate.html` uses it to show a live
"N fetched · M cached · K failed" line during the (potentially multi-minute)
content-fetch phase. Deliberately **not** a determinate percentage bar: an
accurate total would mean duplicating each assembler's internal fetch-URI
logic (`assemble.ts` fetches one chapter per book, `assembleGC.ts` fetches a
conference index *and* one per talk, `notebooks.ts` fetches per entry, with
overlap between them) — that duplication would drift out of sync as those
files change. A live counter is honest, can't go stale, and is enough to
show the page is working. Verified through the actual page (not just the
underlying modules): assigned a `File` to the upload `<input>` via
`DataTransfer` and dispatched `change`, then clicked Generate for real.

### Completeness report (added 2026-09-04)

`src/diagSummary.ts` is the one definition of clean/warning/failed
(`FAIL_CATEGORIES`/`WARN_CATEGORIES`/`OK_CATEGORIES` + `summarizeDiags()`) —
extracted from what was inline in `scripts/validate.ts`'s report and now
shared by both. `generate.html` shows the counts plus an expandable table of
every non-clean row (ref, category, detail, annotation id) — satisfies the
original M6 exit criterion ("the affected annotations are inspectable, no
silent failure") rather than just a pass/fail count. Built with
`document.createElement`/`textContent`, not `innerHTML` string
interpolation, since these rows echo values (URIs, error detail strings)
that ultimately trace back to the user's own annotation data. Verified with
the same synthetic export as the progress-bar test — its fabricated pids
correctly surfaced as 4 "failed" rows (`pid-no-match` + `note-no-anchor`),
each showing the real ref/detail/annotation id.

### Options UI (added 2026-09-04)

`generate.html` now has a real (not stubbed) options form for the two
`DocBook` fields the pipeline already supports: name on the title page
(`personName`) and fixed vs. mirrored margins. "Preface text" and
"merge-to-single-PDF vs. per-Part" from the original M6 idea are **not**
included here — preface doesn't exist as a `DocBook`/`book.typ` field at
all yet (would be new scope, not wiring), and the merge-vs-per-Part choice
belongs with the per-Part packaging work below, not before it exists.
Verified live: set a name and mirrored margins, generated, and the output
byte count changed (18,055 vs. 17,780 bytes for the same annotations)
confirming both options actually reach the compiled PDF, not just the form.

## Next up — agreed, not yet started (as of 2026-09-05)

Parked deliberately so the compile work could land first. In priority order:

1. **Content-fetch concurrency.** Now the longest stage by far — ~1,560
   documents at a 400 ms serial gate is ~10 minutes, against a compile that
   is now ~40 seconds. Plan: a prefetch pass that derives the document URIs
   from the annotations and warms IndexedDB through a pool of 4–6, leaving
   the existing serial assembly untouched (it becomes all cache hits).
   **Prerequisite: retry/backoff on 429 + 5xx.** Today a non-OK response is
   recorded as a failure and the content silently drops out of the book, so
   raising concurrency without backoff would quietly degrade someone's
   keepsake. Deliberately staying polite (4–6, not unbounded): this runs from
   the visitor's own IP against someone else's service, and getting *them*
   rate-limited is a worse failure than being slow.
2. **The generator UI.** Fold `generate.html` into the main page — one page,
   not two. Change `onProgress` from a bare label to structured
   `{done, total, label}` so the progress bar is honest: the fetch stage
   already tracks `{fetched, cacheHits, failed}` against a known total, and
   the compile stage now knows its piece count up front.
3. **Fraunces rendering.** The chosen font "looks quite awful" in the actual
   PDF versus the specimen. Deferred mid-session to avoid a detour; still
   unexamined.
4. **M8** — analytics + a spam-resistant contact route. Note the dependency:
   without any usage measurement we are guessing about where visitors give up
   (see the bookmarklet-onboarding question).
5. **A short walkthrough video for the export step** (added 2026-09-06). The
   install is the clunkiest part of the product and the part most likely to
   lose a non-technical visitor; for that audience a ~40-second screen
   recording is worth more than any amount of prose. Desktop only now that
   decision 29 is amended, which is what makes it cheap — the iPad path
   (add a bookmark, then edit its URL to paste `javascript:`) was the one no
   video could make look easy. Pairs with browser-detected instructions
   (⌘⇧B / Ctrl+Shift+B to reveal the bookmarks bar) and a printable
   one-page sheet, since much of the audience is being helped through this
   by someone else.

Not on this list because it sits with Jeremy, not the code: whether the
annotations can be obtained some other way (an official bulk export, if one
exists) would change the acquisition story more than any amount of onboarding
polish, and the bookmarklet would become the fallback rather than the front
door.

Tuning note: the piece-size numbers above were measured in Node, with a
process per piece standing in for a terminated Worker. Chrome gives wasm a
smaller stack, so `PIECE_UNIT_CAP` may want lowering once a large book has
been run through a real browser. A piece that still overshoots is caught by
bisection, so the failure mode is a slower run, not a broken one.

### Heading font revised: Marcellus, not Fraunces (2026-09-06)

The Fraunces decision above stood for two days and was wrong on one axis
nobody checked: **Fraunces is a serif.** Optima — what the layout was
actually drawn around — is a flared humanist *sans*, so the original design
ran a sans display face against a serif body. Swapping in another serif
quietly removed that contrast, and the pages went flat in a way that was
hard to name ("all renderings just don't jive with me although I can't put
my finger on why"). The candidate bake-off did include seven sans options,
so this wasn't for lack of choice; the comparison was made on individual
specimens rather than against the body text it had to contrast with, and the
serif/sans distinction never surfaced as the deciding question.

Two red herrings chased first, both real defects, neither the actual problem:

- **Typst renders a variable font's default instance**, and Fraunces defaults
  to `opsz 9, SOFT 0, WONK 1` — its sharp, small-text cut. The landing page
  never shows that face (`index.html` sets `font-optical-sizing: auto` plus
  `"SOFT" 40, "WONK" 0` and renders far larger), so site and PDF genuinely
  disagreed. Typst 0.15's `text(variations: ...)` fixes it with no extra font
  files. Measured before believing: **opsz is the only lever that matters**,
  SOFT is subtle, and **WONK changes nothing** for our glyphs — verified
  against genuinely pre-instanced files, not by trusting the axis.
- All of which improved Fraunces without making it the right *category*.

**Decision: `sans = "Marcellus"`** (OFL, google/fonts) — the open face closest
to Optima, confirmed by cropping running heads, chapter headings and part
titles from real compiled pages and comparing the three side by side. All the
Fraunces optical-size machinery was reverted, since a single-face font has no
axes to drive.

Marcellus ships one face. Typst substitutes Regular **silently** — no warning,
no synthesised bold, not even a faux oblique (checked). The cost is near zero:
`weight: "medium"` (16 sites) resolves to Regular under **Optima too**, which
ships only 400 and 700, so nothing is lost against the design that was liked;
nothing sets the display font bold; and the single italic use (the citation
label at the notebook-entry site) moved to the body serif's real italic, which
suits a cited source better anyway. The trap is that this stays silent — a
future bold or italic on `sans` will do nothing — so it is recorded at the
font definition and in `web/fonts/README.md`.

**Left open:** `index.html` still uses Fraunces, including the mock spread in
the hero, so the site now advertises a face the tool doesn't produce. The
Fraunces files stay only because the site references them. Resolve by moving
the site to Marcellus and dropping them.

**Also watch:** Marcellus's stroke contrast is exactly what makes it read like
Optima, and the running heads are 7.5pt in a light gray (`headcol`). Fine on
screen; if it prints weak, darken `headcol` rather than changing the face.
