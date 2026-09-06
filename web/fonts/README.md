# Fonts

Self-hosted so the site makes no third-party requests.

| family | web (site CSS) | typeset (Typst / book.typ) | axes | license |
|---|---|---|---|---|
| **Marcellus** (book headings) | — | `Marcellus-Regular.ttf` | none (single face) | OFL 1.1 — `LICENSE-Marcellus.txt` |
| **EB Garamond** (body) | `ebgaramond.woff2`, `ebgaramond-italic.woff2` | `EBGaramond.ttf`, `EBGaramond-Italic.ttf` | wght 400–800 | OFL 1.1 — `LICENSE-EBGaramond.txt` |
| **Fraunces** (site headings) | `fraunces.woff2`, `fraunces-italic.woff2` | `Fraunces.ttf`, `Fraunces-Italic.ttf` | opsz 9–144, wght 100–900, SOFT, WONK | OFL 1.1 — `LICENSE-Fraunces.txt` |

The `.woff2` files are Latin variable subsets from the `@fontsource-variable`
packages (jsDelivr), used by the site's own CSS. The `.ttf` files are pulled
straight from [google/fonts](https://github.com/google/fonts) — Typst's
WASM/CLI compiler needs raw sfnt (ttf/otf), not woff2 — and are what
`templates/book.typ` compiles the keepsake PDF with, replacing the commercial
Adobe Garamond Pro / Optima pairing (decided 2026-09-04, revised 2026-09-06;
see `docs/decisions.md`).

**The site and the book currently disagree, and that is a known gap, not a
decision.** `index.html` still sets Fraunces as its display face — including
the mock book spread in the hero, which therefore advertises a typeface the
tool no longer produces. The book moved to Marcellus because Fraunces is a
*serif* and the design depends on a sans/serif contrast against the body text;
Marcellus is the open-licensed face closest to the Optima that contrast was
originally drawn around. Fraunces's files are kept only because the site still
references them. Resolve by moving the site to Marcellus too, then dropping
the Fraunces files.

Marcellus ships a single face — no bold, no italic — and Typst substitutes
Regular **silently**, with no warning and no synthesised slant. That costs
nothing today (`weight: "medium"` resolves to Regular under Optima too, and
nothing sets the display font bold), but reaching for bold or italic on `sans`
will quietly do nothing.
