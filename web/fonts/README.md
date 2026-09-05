# Fonts

Self-hosted so the site makes no third-party requests.

| family | web (site CSS) | typeset (Typst / book.typ) | axes | license |
|---|---|---|---|---|
| **Fraunces** (headings) | `fraunces.woff2`, `fraunces-italic.woff2` | `Fraunces.ttf`, `Fraunces-Italic.ttf` | opsz 9–144, wght 100–900, SOFT, WONK | OFL 1.1 — `LICENSE-Fraunces.txt` |
| **EB Garamond** (body) | `ebgaramond.woff2`, `ebgaramond-italic.woff2` | `EBGaramond.ttf`, `EBGaramond-Italic.ttf` | wght 400–800 | OFL 1.1 — `LICENSE-EBGaramond.txt` |

The `.woff2` files are the Latin variable subsets from the
`@fontsource-variable` packages (jsDelivr), used by the site's own CSS. The
`.ttf` files are the full variable fonts pulled straight from
[google/fonts](https://github.com/google/fonts) — Typst's WASM/CLI compiler
needs raw sfnt (ttf/otf), not woff2 — and are what `templates/book.typ`
compiles the keepsake PDF with, replacing the commercial Adobe Garamond
Pro/Optima pairing (decided 2026-09-04; see `docs/decisions.md` "Font
licensing"). Both formats are the same two font families on purpose: one
license pair to track, one visual identity across the site and the book.
