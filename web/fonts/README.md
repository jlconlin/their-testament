# Fonts

The files. **What type is used where, and the rules for using it, live in
[`docs/typography.md`](../../docs/typography.md)** — read that first.

Self-hosted so the site makes no third-party requests.

| family | web (site CSS) | typeset (Typst / book.typ) | axes | license |
|---|---|---|---|---|
| **Marcellus** (display) | `marcellus.woff2` | `Marcellus-Regular.ttf` | none (single face) | OFL 1.1 — `LICENSE-Marcellus.txt` |
| **EB Garamond** (reading) | `ebgaramond.woff2`, `ebgaramond-italic.woff2` | `EBGaramond.ttf`, `EBGaramond-Italic.ttf` | wght 400–800 | OFL 1.1 — `LICENSE-EBGaramond.txt` |

Two formats of the same two families. The `.woff2` files serve the site's CSS;
the `.ttf` files are what Typst compiles the PDF with — its WASM and CLI
compilers need raw sfnt, not woff2. Both are pulled from
[google/fonts](https://github.com/google/fonts); `marcellus.woff2` is converted
from the `.ttf` with `fontTools` (`TTFont(src); f.flavor = "woff2"`).

## If you add or change a family

1. Add **both** formats here, plus its OFL licence file.
2. Add the `.ttf` to the font list in `web/generate.html` — the browser only
   gets the files that list names, and a missing family falls back silently to
   Typst's default face. The CLI won't catch this for you: it reads the whole
   directory.
3. Add the `@font-face` and a preload to `web/index.html` if it is used above
   the fold.
4. Update `docs/typography.md`.
