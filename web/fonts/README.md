# Fonts

Self-hosted so the site makes no third-party requests.

| family | web (site CSS) | typeset (Typst / book.typ) | axes | license |
|---|---|---|---|---|
| **Marcellus** (headings) | `marcellus.woff2` | `Marcellus-Regular.ttf` | none (single face) | OFL 1.1 — `LICENSE-Marcellus.txt` |
| **EB Garamond** (body) | `ebgaramond.woff2`, `ebgaramond-italic.woff2` | `EBGaramond.ttf`, `EBGaramond-Italic.ttf` | wght 400–800 | OFL 1.1 — `LICENSE-EBGaramond.txt` |

Two families, used by both the site and the book. The `.woff2` files are for
the site's CSS; the `.ttf` files are what Typst compiles the PDF with — its
WASM/CLI compiler needs raw sfnt, not woff2. They are the same two typefaces on
purpose: one license pair to track, and a landing page that is set in the same
face as the thing it is advertising.

**Marcellus ships exactly one face — no bold, no italic.** Neither Typst nor a
browser synthesises them: both silently fall back to Regular, with no warning
and no faux slant. So don't set a weight or an italic on a heading; it will do
nothing rather than fail loudly. Real bold and italic are available on the body
face (EB Garamond), which is where a person's own notes render anyway.

## Keeping the sample spread honest

The hero's mock page (`.leaf` in `index.html`) exists to show what the tool
actually produces, so its type mirrors `templates/book.typ` — Marcellus running
heads, EB Garamond body, and the book's own colours through the `--book-*`
tokens, each commented with the `book.typ` name it mirrors.

It had drifted badly before: verse numbers, note reference headers and tag
labels were all set in `--sans`, i.e. the *visitor's operating-system UI font*,
so the sample rendered differently on macOS, Windows and Android and matched
the book on none of them.

It stays a hand-built HTML crop rather than a screenshot of a compiled page,
deliberately — compact, selectable, responsive and dark-mode aware in a way an
image is not. The price is that it can drift again. **If you change type or
colour in `book.typ`, change it in `.leaf` too.**

## Font lists are duplicated — keep them in step

`web/generate.html` names the font files it hands to the WASM compiler. That
list must match the families `book.typ` asks for. The CLI path forgives a
mismatch because it reads a whole font directory; the browser does not, and an
unlisted family falls back silently to Typst's default face. Adding a family to
the template means adding its `.ttf` to that list.
