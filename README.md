# Their Testament

Turn a lifetime of Gospel Library annotations — highlights, margin notes, tags —
into a typeset keepsake **book**. Every verse someone marked, shown in context and
in the color they chose; every note beside it, in their own words, unedited;
ordered like scripture, with a table of contents and a tag index.

**[theirtestament.org](https://theirtestament.org)** · an independent project,
not affiliated with The Church of Jesus Christ of Latter-day Saints.

---

## How it's split

| half | what | where |
|---|---|---|
| **Acquisition** | A bookmarklet that reads your annotations (with your own login, on the Church's site) and saves them as one `annotations.json` file. | [`web/`](web/) |
| **Generation** | Given a valid `annotations.json`, builds the PDF. Runs the pipeline in `src/`, typesets with [Typst](https://typst.app). | [`src/`](src/), [`templates/`](templates/) |

The file that connects them is a documented, versioned interchange format:
[`docs/annotations-format.md`](docs/annotations-format.md). Anything that can
produce that file works with the generator.

## Layout

```
web/            the website + the bookmarklet exporter (deployed to GitHub Pages)
src/            the generation pipeline (TypeScript)
templates/      the Typst book template
scripts/        build & validation entry points
docs/           design decisions, format spec, validation results
```

## Running the generator (developer)

```bash
npm install
npx tsx scripts/check-export.ts path/to/annotations.json   # validate an export
npx tsx scripts/validate.ts --render                        # build the full book
npx tsx scripts/build-job.ts                                # build one book (Job)
```

Needs [Typst](https://github.com/typst/typst) on PATH (`brew install typst`).
Fonts for the book are configured per-run; see `docs/decisions.md`.

## The website

`web/` is a static site — no build step. Deployed to GitHub Pages by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push that
touches it. To preview locally:

```bash
npm run serve:web        # → http://localhost:8777
```

The bookmarklet loader is regenerated with:

```bash
npm run build:bookmarklet
```

## Status

Concept proven end to end; validated on the full ~19,900-annotation corpus
(99% clean reconstruction). The bookmarklet exporter and this site are built.
The in-browser generator is next. See [`docs/decisions.md`](docs/decisions.md)
for the full milestone log.

## License

Code: MIT (see `LICENSE`). Fonts under `web/fonts/` are SIL OFL 1.1 — see the
license files there. Scripture text is quoted for illustration only.
