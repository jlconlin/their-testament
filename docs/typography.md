# Typography

The canonical statement of what type this project uses and where. Anything new
— a page, a template, an email, a diagram — follows this. Font *files*,
formats and licences are catalogued in [`web/fonts/README.md`](../web/fonts/README.md);
the history of how these were chosen is in [`decisions.md`](decisions.md).

## Three faces, three jobs

| face | job | used for |
|---|---|---|
| **Marcellus** | display | book headings, part titles, running heads, chapter and talk headings; site headings, brand, 404 |
| **EB Garamond** | reading | book body — verses, paragraphs, notes, tag index; site prose; everything inside the sample spread |
| **platform sans** (`-apple-system`, Segoe UI, Roboto…) | interface only | eyebrow labels, nav, buttons, badges, CTA links |

Both custom faces are SIL OFL and self-hosted; the site makes no third-party
font requests. The platform sans is deliberately *not* a bundled face — see
below.

## Rules

**1. Never set a weight or an italic on Marcellus.** It ships exactly one face.
Neither Typst nor a browser synthesises the missing ones — both silently fall
back to Regular, with no warning and no faux slant. A `font-weight: 600` on a
heading does nothing; it doesn't fail, it just quietly has no effect. Where
emphasis is needed, get it from size, tracking, colour or case.

**2. Real bold and italic come from EB Garamond.** It has genuine weights
(400–800) and a real italic file. This is also where a person's own notes
render, so their emphasis is always faithful.

**3. The platform sans is for interface chrome only.** Never for content, and
never inside the sample spread. Matching the visitor's operating system is the
*point* for a nav link or a button — it reads as native and clickable. It is
wrong anywhere that represents the book, because it renders as San Francisco
on macOS, Segoe UI on Windows and Roboto on Android, and matches the printed
page on none of them. (That bug shipped once; see decisions.md.)

**4. The sample spread mirrors the book, not the site.** Everything inside
`.leaf` in `index.html` follows `templates/book.typ` — including colour, via
the `--book-*` tokens, each named for the template variable it mirrors. Its job
is to show what the tool actually produces. **Change type or colour in
`book.typ` and you must change `.leaf` too.**

**5. The generator's font list must match the template.** `web/generate.html`
names the `.ttf` files handed to the WASM compiler. The CLI reads a whole font
directory and forgives a mismatch; the browser only gets what that list names,
and an unlisted family falls back silently to Typst's default face. Adding a
family to `book.typ` means adding its file there.

## The book's palette

`index.html` mirrors these so the sample spread stays truthful. Keep the two in
step.

| `book.typ` | `index.html` | value | used for |
|---|---|---|---|
| `ink` | `--book-ink` | `#1a1712` | body text |
| `notegray` | `--book-note` | `#544f49` | margin notes |
| `tagcol` | `--book-tag` | `#8a7f6f` | tags, reference labels |
| `vnumcol` | `--book-vnum` | `#8f2704` | verse and paragraph numbers |
| `headcol` | `--book-head` | `#8a8378` | running heads |

Highlight colours are the real Gospel Library palette and are not ours to
change — see `typeset/palette.md`.

## Where this is implemented

- `templates/book.typ` — the book (`sans` = Marcellus, body = EB Garamond)
- `web/index.html` — the site, plus the `--book-*` mirror for the sample spread
- `web/404.html`
- `web/generate.html` — **the known gap**

## Known gap

`generate.html` is still styled as a bare development page: system sans,
default sizes, none of the project's type or colour. It is the page people use
to actually make their book, so it is also the least finished thing they see.
Consolidating it into the main page is already on the next-up list in
`decisions.md`, which is why it hasn't been restyled in place — doing both
would mean doing the work twice. Until then, this document describes three of
the four pages.
