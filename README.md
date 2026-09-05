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
web/            the website + the bookmarklet exporter (static; deployed as-is)
src/            the generation pipeline (TypeScript)
templates/      the Typst book template
scripts/        build & validation entry points
docs/           format spec, exporter notes, the design decisions log
```

Full-corpus validation results and other write-ups that describe the real
annotation data are kept locally in a git-ignored `docs/private/`, not
published here.

## Running the generator (developer)

```bash
npm install
npx tsx scripts/check-export.ts path/to/annotations.json   # validate an export
npx tsx scripts/validate.ts --render                        # build the full book
npx tsx scripts/build-job.ts                                # build one book (Job)
```

Needs [Typst](https://github.com/typst/typst) on PATH (`brew install typst`).
Fonts (Fraunces + EB Garamond) are bundled in `web/fonts/` — no install
step; see `docs/decisions.md` ("Font licensing") for how that was chosen.

## The website

`web/` is a static site — no build step. Deploy by pointing a static host
(Cloudflare Pages, Netlify, …) at this repo with output directory `web/`; it
redeploys on push. `web/_headers` carries the cache/security headers. To preview
locally:

```bash
npm run serve:web        # → http://localhost:8777
```

The bookmarklet loader is regenerated with:

```bash
npm run build:bookmarklet
```

## Status

Concept proven end to end; validated on the full ~19,900-annotation corpus
(99% clean reconstruction). The bookmarklet exporter ([`web/e.js`](web/e.js))
and this landing site are built. The in-browser generator (upload → options →
download, no server) is next.

A formal permission request covering scripture and General Conference talk
text was submitted to the Church's Intellectual Property Office on
2026-09-04 (request #L26-64433); a response is expected within ~45 days.

See [`docs/decisions.md`](docs/decisions.md) for the full milestone log
(including that request's details, under "M7") and
[`docs/m5-exporter.md`](docs/m5-exporter.md) for how the exporter works.

## License

Code: MIT (see `LICENSE`). Fonts under `web/fonts/` are SIL OFL 1.1 — see the
license files there. Scripture text is quoted for illustration only.
