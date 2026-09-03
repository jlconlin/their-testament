# Gospel Library Preservation

Turn a person's Gospel Library annotations (highlights, notes, tags) into a
beautifully typeset PDF book — their marked verses and paragraphs reproduced in
the original highlight colors, with their notes set in the margin beside the text
they belong to.

Not a data dump. A book — meant to be read, kept, and printed.

See [`docs/project-overview.md`](docs/project-overview.md) for the full picture
and [`docs/decisions.md`](docs/decisions.md) for the design-decision log.

## Status

| | |
|---|---|
| Scripture rendering | **working** — validated on the book of Job (44/44 marks) |
| General Conference rendering | **working** — validated on April 2015 (299/299 marks) |
| Full-corpus validation | next (see milestones) |
| Web generator + bookmarklet exporter | designed, not built |

## Pipeline

```
annotations.json ─┐
                  ├─►  fetch     pull + parse the referenced scripture/talk text
Church content ───┘             (public content API, cached)
   (fetched)          locate    map Gospel Library word offsets → character spans
                      assemble  build a render-ready document model (JSON)
                      typeset    Typst → PDF
```

- **Language:** TypeScript (so it can ship to the browser later).
- **Engine:** Typst (compiles to WASM; single small binary; fast).
- Every design choice is a config flag with a chosen default.

## Layout

| path | |
|---|---|
| `src/`              | pipeline modules (`verses`, `talk`, `locate`, `noteHtml`, `segment`, `units`, `assemble`, `assembleGC`, `contentApi`, `render`) |
| `templates/book.typ`| the Typst book template |
| `scripts/build-job.ts`, `build-gc.ts` | milestone build entry points |
| `data/raw/`         | archived annotation exports, one dir per pull (gitignored) |
| `data/cache/content/` | fetched Church content (gitignored) |
| `out/`              | generated PDFs + validation reports (gitignored) |
| `docs/`             | overview + decision log |

## Running

```bash
npm install
npm run build:job    # → out/job/job.pdf
npx tsx scripts/build-gc.ts   # → out/gc/gc.pdf
```

Requires the `typst` CLI on PATH and Adobe Garamond Pro installed (font choice
not yet finalized).

## Milestones (revised after external review)

1. **Full-corpus validation** — run all ~19,900 annotations; classify every
   failure; measure size / time / memory; Typst-WASM stress test.
2. **Stable `annotations.json` interchange format** — documented, versioned,
   validated; unknown fields preserved.
3. **Bookmarklet / exporter** — the simplest reliable way to get annotations out
   of Gospel Library, producing the standard interchange file.
4. **Browser generator** — the public static site: upload → options → generate →
   completeness report → download.
5. **Public-release readiness** — copyright + API-terms review, privacy, docs,
   compatibility, naming.
6. **Optional expansion** — browser extension, Android export, CLI, more content
   types, preservation archive.
