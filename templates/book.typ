// Gospel Library keepsake — book template (Milestone 1: scripture Parts).
// Consumes doc.json (DocBook).

#let doc = json(sys.inputs.at("doc", default: "doc.json"))

// "full" (default, one compile, everything -- the CLI/dev path, and the
// browser's own first attempt for a small book): "front" (title/overview/
// parts-list only), "part" (doc.parts holds exactly one part, no front/back
// matter), or "back" (unplaced-notes/tag-index only). When a book is too
// big for one pass, the browser generator compiles front + one "part" call
// per Part + back, in that order, and concatenates the resulting PDFs --
// a large real corpus overflows the WASM compiler's stack in one pass
// (measured: a ~17,000-verse book crashes reliably in Chrome, though the
// same document compiles fine via the native CLI, which gets a much larger
// stack). "back" is its own mode (not folded into "front") so that after
// concatenation those pages land at the actual end of the book.
#let mode = sys.inputs.at("mode", default: "full")

// ---- cross-file links ------------------------------------------------------
//
// When the book is compiled in pieces, a link can't reach into a different
// PDF -- so a piece's targets and references can't find each other at compile
// time. Instead every target emits an invisible marker annotation carrying
// its key ("ttdef://<key>"), every reference emits a matching "ttref://<key>",
// and the merge step (mergePdf.ts) resolves each ref to the real page once all
// the pieces sit in one file. Typst passes unknown URI schemes through
// verbatim as link annotations, which is what makes this work.
//
// In "full" mode none of this is needed: ordinary in-document links resolve.
#let splitmode = mode != "full"
#let anchor(key, body) = if splitmode { link("ttdef://" + key, body) } else { body }

// A Part so large it had to be divided across several compiles: only the first
// piece carries the Part title page and contents, the rest just continue.
#let continued = sys.inputs.at("continued", default: "no") == "yes"

// key -> absolute page number in the merged book, supplied by the caller once
// every Part's length is known. Lets the tag index print true book page
// numbers instead of per-Part relative ones.
#let pagemap = if "pagemap" in sys.inputs { json(sys.inputs.at("pagemap")) } else { (:) }

#let colw = 3.30in
#let gapw = 0.18in
#let notew = 1.52in
#let overhang-cap = 150pt

#let fillcol = (
  red: rgb("#FFDCE0"), pink: rgb("#FEDEFB"), orange: rgb("#FFE6CC"),
  yellow: rgb("#FEF1B4"), green: rgb("#EAF5CB"), blue: rgb("#CFF7F9"),
  dark_blue: rgb("#DCEEFF"), purple: rgb("#EFE3FF"), brown: rgb("#F5E5DE"),
  gray: rgb("#ECEEF0"),
)
#let linecol = (
  red: rgb("#FE4F66"), pink: rgb("#F85BEA"), orange: rgb("#F08A1E"),
  yellow: rgb("#E0AE00"), green: rgb("#86AE1C"), blue: rgb("#10AEB5"),
  dark_blue: rgb("#2596FF"), purple: rgb("#9D53FE"), brown: rgb("#C06B45"),
  gray: rgb("#93A0AA"),
)
// Marcellus: a flared, glyphic Roman -- the open-licensed face closest to
// Optima, which this design was originally drawn around. It is deliberately a
// *sans* against the serif body: that contrast is the point, and it was lost
// while Fraunces (a serif) held this slot. See docs/typography.md.
//
// It ships exactly one face -- no bold, no italic -- and Typst substitutes
// Regular silently, with no warning and no synthesised slant. That costs
// nothing here: `weight: "medium"` resolves to Regular in Optima too (Optima
// ships only 400 and 700), and nothing sets the display font bold. But if you
// ever reach for bold or italic on `sans`, it will quietly do nothing.
#let sans = "Marcellus"   // headings & titles (body stays serif)
#let ink = rgb("#1a1712")
#let notegray = rgb("#544f49")
#let tagcol = rgb("#8a7f6f")
#let headcol = rgb("#8a8378")
#let vnumcol = rgb("#8f2704")
#let gapmark = rgb("#bcb4a6")

#let mdebt = state("mdebt", 0pt)

#let vkey(part, book, ch, ref) = part + "|" + book + "|" + str(ch) + "|" + ref
#let ckey(part, book, ch) = part + "|" + book + "|" + str(ch)
#let pkey(part) = "P|" + part

// ---- page + base styles ----------------------------------------------------

#let mirrored = doc.at("margins", default: "fixed") == "mirrored"

#set page(
  width: 6in, height: 9in,
  margin: if mirrored {
    (inside: 0.8in, outside: 1.9in, top: 0.9in, bottom: 0.85in)
  } else {
    (left: 0.8in, right: 1.9in, top: 0.9in, bottom: 0.85in)
  },
  header: context {
    let hp = here().page()
    // Binary search, not a scan: this runs once per page, and a linear pass
    // over every <rh> in the book made the header cost pages x markers --
    // ~2.6M introspector lookups per layout pass on a real corpus, about a
    // third of the compiler's peak memory. Query results come back in
    // document order, so the last entry whose page <= hp is the current one.
    let rhs = query(<rh>)
    let lo = 0
    let hi = rhs.len()
    while lo < hi {
      let mid = int((lo + hi) / 2)
      if rhs.at(mid).location().page() <= hp { lo = mid + 1 } else { hi = mid }
    }
    if lo == 0 { return }
    let cur = rhs.at(lo - 1).value
    // <pm> is one marker per Part (a handful), so a scan is fine here.
    let pstart = 0
    for m in query(<pm>) { if m.location().page() <= hp { pstart = m.location().page() } }
    let folio = hp - pstart
    set text(font: sans, size: 7.5pt, tracking: 0.16em, fill: headcol, number-type: "lining")
    box(width: colw)[#upper(cur) #h(1fr) #if folio > 0 [#folio]]
  },
  header-ascent: 45%,
)
#set text(font: "EB Garamond", size: 10.5pt, fill: ink, lang: "en", number-type: "old-style")
#set par(justify: true, leading: 0.58em, spacing: 0.62em, linebreaks: "optimized")

// Headings drive the PDF outline (bookmarks) only; we render our own visuals.
#set heading(numbering: none, outlined: false, bookmarked: true)
#show heading: none
#show link: it => it   // no underline on internal links

// ---- marks ---------------------------------------------------------------

#let apply-mark(body, color, kind) = {
  if kind == "underline" {
    underline(body, stroke: 1.0pt + linecol.at(color), offset: 2.1pt, evade: false)
  } else if color != "clear" {
    highlight(body, fill: fillcol.at(color), top-edge: "ascender", bottom-edge: "descender", extent: 0pt)
  } else { body }
}

#let render-run(r) = {
  let body = r.text
  if r.smallcaps { body = smallcaps(body) }
  if r.italic { body = emph(body) }
  if r.underline != none { body = apply-mark(body, r.underline, "underline") }
  if r.fill != none { body = apply-mark(body, r.fill, "fill") }
  if r.at("letter", default: none) != none {
    body = [#super(text(size: 6pt, fill: tagcol)[#r.letter])#body]
  }
  body
}

// ---- note body ---------------------------------------------------------

#let render-inline(nodes) = {
  for n in nodes {
    if n.t == "text" { n.s }
    else if n.t == "b" { strong(render-inline(n.children)) }
    else if n.t == "i" { emph(render-inline(n.children)) }
    else if n.t == "link" {
      let inner = underline(render-inline(n.children), stroke: 0.4pt + tagcol, offset: 1.6pt)
      if n.href != none { link(n.href, inner) } else { inner }
    }
  }
}

#let render-note-body(blocks) = {
  for (i, b) in blocks.enumerate() {
    if i > 0 { parbreak() }
    if b.t == "p" { render-inline(b.children) }
    else if b.t == "quote" { pad(left: 0.6em, text(style: "italic")[#render-inline(b.children)]) }
    else if b.t == "ul" or b.t == "ol" {
      set par(spacing: 0.35em, leading: 0.5em)
      for (j, it) in b.items.enumerate() {
        let marker = if b.t == "ul" { [•] } else { [#(j + 1).] }
        grid(columns: (1.2em, 1fr), column-gutter: 0.3em, marker, render-inline(it))
      }
    }
  }
}

#let ref-header(n) = {
  let lbl = n.refLabel + n.at("letter", default: "")
  let b = text(fill: notegray)[#lbl]
  if n.mark != none { apply-mark(b, n.mark.color, n.mark.style) } else { text(fill: tagcol)[#b] }
}

#let one-note(n) = block(width: 100%, breakable: false, {
  set par(justify: false, leading: 0.46em, spacing: 0.4em)
  text(size: 7.6pt, tracking: 0.04em, number-type: "lining")[#ref-header(n)]
  parbreak()
  if n.title != none { text(style: "italic", weight: "bold", fill: notegray)[#n.title]; linebreak() }
  text(fill: notegray)[#render-note-body(n.body)]
  if n.tags.len() > 0 {
    linebreak(); v(0.15em)
    text(size: 6.6pt, tracking: 0.08em, fill: tagcol)[
      #box(baseline: 0.5pt, rect(width: 3.4pt, height: 3.4pt, fill: tagcol, stroke: none))
      #h(0.3em)#smallcaps(n.tags.join("  ·  "))
    ]
  }
})

#let note-stack(notes) = {
  set text(size: 8pt, fill: notegray, number-type: "old-style")
  set par(hanging-indent: 0pt, first-line-indent: 0pt)
  for (i, n) in notes.enumerate() {
    if i > 0 { v(0.5em) }
    one-note(n)
  }
}

// ---- verse -------------------------------------------------------------

// unit = scripture verse ("verse") or talk paragraph ("para").
// Both carry a small leading number (verse / paragraph).
#let unit(key, vs, kind: "verse", cw: colw) = context {
  set par(hanging-indent: 1.0em)

  if vs.gapBefore {
    v(0.35em)
    align(center, box(width: cw)[#align(center, text(fill: gapmark, size: 9pt)[⋯])])
    v(0.35em)
  }

  let vbody = {
    [#metadata(key)<vm>]
    // the unit number doubles as this unit's cross-file anchor
    anchor(key, text(size: 8pt, fill: vnumcol)[#vs.num])
    h(0.4em)
    for r in vs.runs { render-run(r) }
  }
  let vh = measure(box(width: cw, vbody)).height
  let has-note = vs.notes.len() > 0

  if has-note {
    let debt = mdebt.get()
    if debt > 0pt { v(debt); mdebt.update(0pt) }
    let nc = note-stack(vs.notes)
    let nh = measure(box(width: notew, nc)).height
    // mirrored: notes in the outer margin (right on recto, left on verso)
    let verso = mirrored and calc.even(here().page())
    let dx = if verso { -(gapw + notew) } else { cw + gapw }
    place(dx: dx, dy: 0.15em, box(width: notew, nc))
    vbody
    parbreak()
    mdebt.update(calc.min(calc.max(0pt, nh - vh), overhang-cap))
  } else {
    vbody
    parbreak()
    mdebt.update(d => calc.max(0pt, d - vh))
  }
}

#let verse(part, book, chnum, vs) = unit(vkey(part, book, chnum, vs.ref), vs, kind: "verse")

// ---- front / structural pages ----------------------------------------------

// Front / back matter: no notes, so use symmetric book margins and a centered block.
#let matter-margin = (left: 0.95in, right: 0.95in, top: 1.0in, bottom: 0.9in)

#let plain-page(body) = page(
  header: none, numbering: none, margin: matter-margin,
  { set par(justify: false); body },
)

#let title-page() = plain-page({
  v(2.4in)
  align(center, {
    text(font: sans, size: 22pt, weight: "regular", tracking: 0.02em)[#doc.at("title", default: "Scripture Markings")]
    if doc.personName != none { v(0.55em); text(font: sans, size: 13pt, fill: notegray)[#doc.personName] }
  })
  v(1fr)
  align(center, text(size: 9pt, fill: headcol, number-type: "lining")[#doc.generatedAt.slice(0, 10)])
})

// Copyright page -- the verso of the title leaf, where a reader expects to
// find it. The scripture and conference text in this book is not ours: it is
// reproduced under churchofjesuschrist.org's terms of use, which permit
// downloading and printing "for your own personal, noncommercial use" and
// require that proprietary notices not be removed. Hence this page, and hence
// the "not for sale" line -- a book that is sold or redistributed is outside
// the permission this one relies on.
#let copyright-page() = plain-page({
  v(1fr)
  set par(justify: false, leading: 0.62em, spacing: 0.75em)
  set text(size: 8pt, fill: notegray)
  block(width: 100%, {
    [Scripture passages and general conference excerpts reproduced in this
     volume are the copyrighted property of Intellectual Reserve, Inc., and of
     The Church of Jesus Christ of Latter-day Saints. They appear here under
     the terms of use of #link("https://www.churchofjesuschrist.org")[churchofjesuschrist.org],
     which permit material from that site to be downloaded and printed for
     personal, noncommercial use.]
    parbreak()
    [Only passages that the reader of these scriptures personally marked are
     included; the scriptures are not reproduced in full.]
    parbreak()
    [The notes, highlights, and tags are the work of the person named on the
     title page and remain their own.]
    parbreak()
    [This is a personal keepsake, not for sale or redistribution. It is not an
     official publication of The Church of Jesus Christ of Latter-day Saints,
     and is not affiliated with or endorsed by the Church.]
    parbreak()
    [Made with Their Testament · #link("https://theirtestament.org")[theirtestament.org] ·
     typeset with Typst · #doc.generatedAt.slice(0, 10)]
  })
})

#let stats-page() = plain-page({
  v(1.6in)
  align(center, text(font: sans, size: 12pt, weight: "medium", tracking: 0.22em)[#upper("An Overview")])
  v(0.6in)
  set par(justify: false, leading: 0.9em)
  let s = doc.stats
  align(center, box(width: 4in)[
    #grid(columns: (1fr, auto), row-gutter: 0.7em, align: (left, right),
      [Annotations span], text(number-type: "lining")[#s.dateRange.at(0).slice(0,4)–#s.dateRange.at(1).slice(0,4)],
      [Verses marked], text(number-type: "lining")[#s.versesMarked],
      [Notes written], text(number-type: "lining")[#s.notesWritten],
      [Tags used], text(number-type: "lining")[#s.tagsUsed],
    )
    #v(1em)
    #text(fill: notegray)[Most-used tags]
    #v(0.4em)
    #text(size: 9pt)[#s.topTags.map(t => t.at(0)).join("  ·  ")]
  ])
})

// Master front matter: a short list of the Parts (no chapter detail — each Part
// carries its own contents).
#let parts-page() = plain-page(context {
  v(1.1in)
  align(center, text(font: sans, size: 12pt, weight: "medium", tracking: 0.22em)[#upper("The Parts")])
  v(0.4in)
  set par(justify: false, leading: 0.6em, spacing: 0.8em)
  for part in doc.parts {
    let pl = query(<pm>).filter(x => x.value == pkey(part.key))
    let ploc = if pl.len() > 0 { pl.first().location() } else { none }
    let summary = if part.kind == "scripture" {
      let books = part.chapters.map(c => c.book).dedup()
      [#books.len() book#if books.len() != 1 [s], #part.chapters.len() chapters]
    } else if part.kind == "gc" {
      let n = part.conferences.map(c => c.talks.len()).sum(default: 0)
      [#part.conferences.len() conferences, #n talks]
    } else {
      [#part.notebooks.len() collections]
    }
    block(box(width: 100%, {
      let title = text(font: sans, weight: "medium", size: 11pt)[#part.title]
      if ploc != none { link(ploc, title) }
      else if pkey(part.key) in pagemap { link("ttref://" + pkey(part.key), title) }
      else { title }
      linebreak()
      text(size: 8.5pt, fill: notegray)[#summary]
    }))
  }
  v(1em)
  if doc.at("unplacedNotes", default: ()).len() > 0 {
    let label = text(font: sans, weight: "medium", size: 11pt)[Notes We Couldn't Place]
    let ul = query(<um>)
    if ul.len() > 0 { link(ul.first().location(), label) }
    else if "unplaced-notes" in pagemap { link("ttref://unplaced-notes", label) }
    else { label }
    linebreak()
  }
  {
    let label = text(font: sans, weight: "medium", size: 11pt)[Tag Index]
    let il = query(<im>)
    if il.len() > 0 { link(il.first().location(), label) }
    else if "tag-index" in pagemap { link("ttref://tag-index", label) }
    else { label }
  }
})

// Per-Part contents page — rendered at the front of each Part.
#let part-toc(part) = plain-page(context {
  let pstart = query(<pm>).filter(x => x.value == pkey(part.key)).first().location().page()
  let relPage = loc => if loc == none { none } else { loc.page() - pstart }
  // One pass to build the lookup, rather than re-filtering every <cm> in the
  // book once per contents line (quadratic on a Part with 649 talks).
  let cmMap = (:)
  for m in query(<cm>) { if m.value not in cmMap { cmMap.insert(m.value, m.location()) } }
  let cmOf = m => cmMap.at(m, default: none)

  // faint dotted leader between content and page number
  let leader = box(width: 1fr, inset: (x: 0.4em), repeat(text(fill: rgb("#c9c1b3"))[.], gap: 0.28em))

  v(0.9in)
  align(center, text(font: sans, size: 11pt, weight: "medium", tracking: 0.2em, fill: rgb("#4a4238"))[#upper(part.title) #h(0.4em) — #h(0.4em) #upper("Contents")])
  v(0.45in)
  set par(justify: false, leading: 0.5em, spacing: 0.5em)

  if part.kind == "scripture" {
    let books = ()
    for ch in part.chapters {
      if books.len() == 0 or books.last().at(0) != ch.book { books.push((ch.book, ())) }
      books.last().at(1).push(ch)
    }
    for (bname, chs) in books {
      let word = chs.first().at("chapterWord", default: "Chapter")
      block(above: 0.6em, below: 0.15em, text(font: sans, weight: "medium", size: 9.5pt)[#bname])
      // chapters, wrapped ~10 per line; page number per line = first chapter of that line
      let per = 10
      let lines = range(0, chs.len(), step: per).map(i => chs.slice(i, calc.min(i + per, chs.len())))
      for grp in lines {
        let loc = cmOf(ckey(part.key, bname, grp.first().chapter))
        block(above: 0.12em, below: 0.12em, pad(left: 1em, box(width: 100% - 1em, {
          set text(size: 8.5pt)
          grp.map(ch => {
            let l = cmOf(ckey(part.key, bname, ch.chapter))
            if l != none { link(l)[#ch.chapter] } else { [#ch.chapter] }
          }).join(", ")
          leader
          text(size: 7.5pt, fill: notegray, number-type: "lining")[#relPage(loc)]
        })))
      }
    }
  } else if part.kind == "gc" {
    for conf in part.conferences {
      block(above: 0.6em, below: 0.15em, text(font: sans, size: 9pt, fill: notegray)[#conf.label])
      for talk in conf.talks {
        let loc = cmOf(part.key + "|" + conf.key + "|" + talk.slug)
        let p = relPage(loc)
        block(above: 0.14em, below: 0.14em, pad(left: 1em, box(width: 100% - 1em, {
          let body = [#text(size: 8.5pt)[#talk.title]#text(size: 8pt, fill: notegray)[ · #talk.speaker]]
          if loc != none { link(loc, body) } else { body }
          leader
          if p != none { text(size: 7.5pt, fill: notegray, number-type: "lining")[#p] }
        })))
      }
    }
  }
  if part.kind == "notebooks" {
    for nb in part.notebooks {
      let loc = cmOf(part.key + "|" + nb.name)
      let p = relPage(loc)
      block(above: 0.4em, below: 0.15em, box(width: 100%, {
        let body = text(font: sans, size: 9.5pt)[#nb.name]
        if loc != none { link(loc, body) } else { body }
        leader
        if p != none { text(size: 7.5pt, fill: notegray, number-type: "lining")[#p] }
      }))
    }
  }
})

// ---- unplaced notes (a note whose highlight didn't resolve to a spot) -----
// Rather than silently drop a person's own words when we can't place them
// next to a specific verse, they're kept here instead.

#let unplaced-notes-section() = {
  let notes = doc.at("unplacedNotes", default: ())
  if notes.len() == 0 { return }
  page(numbering: none, margin: matter-margin, header: context {
    set text(font: sans, size: 7.5pt, tracking: 0.16em, fill: headcol)
    upper("Notes We Couldn't Place")
  })[
    #{
      heading(level: 1)[Notes We Couldn't Place]
      [#metadata("unplaced-notes")<um>]
    }
    #v(0.5in)
    #align(center, anchor("unplaced-notes",
      text(font: sans, size: 12pt, weight: "medium", tracking: 0.22em)[#upper("Notes We Couldn't Place")]))
    #v(0.2in)
    #align(center, box(width: 4in, text(size: 8.5pt, fill: notegray, style: "italic")[
      These notes' highlights couldn't be matched to a specific verse or
      paragraph — often because the underlying page changed since the note
      was made — so they're kept here instead of being left out.
    ]))
    #v(0.4in)
    #set par(justify: false, leading: 0.55em)
    #for (i, n) in notes.enumerate() {
      if i > 0 {
        v(0.4em)
        align(center, box(width: 24%, line(length: 100%, stroke: 0.3pt + gapmark)))
        v(0.4em)
      }
      block(breakable: true, {
        text(font: sans, size: 8pt, tracking: 0.03em, fill: tagcol)[#n.source]
        h(1fr)
        text(font: sans, size: 6.5pt, fill: tagcol, number-type: "lining")[#n.created]
        linebreak()
        if n.title != none { text(font: sans, size: 9.5pt, weight: "medium")[#n.title]; parbreak() }
        set text(fill: notegray)
        render-note-body(n.body)
        if n.tags.len() > 0 {
          linebreak()
          text(size: 6.6pt, tracking: 0.08em, fill: tagcol)[#smallcaps(n.tags.join("  ·  "))]
        }
      })
    }
  ]
}

// ---- tag index (one, combined, at the back) ------------------------------

#let tag-index() = {
  page(numbering: none, margin: matter-margin, header: context {
    set text(font: sans, size: 7.5pt, tracking: 0.16em, fill: headcol)
    upper("Tag Index")
  })[
    #{
      heading(level: 1)[Tag Index]
      [#metadata("tag-index")<im>]
    }
    #v(0.5in)
    #align(center, anchor("tag-index",
      text(font: sans, size: 12pt, weight: "medium", tracking: 0.22em)[#upper("Tag Index")]))
    #v(0.35in)
    #set text(size: 8.5pt)
    #set par(justify: false, leading: 0.5em, spacing: 0.55em, hanging-indent: 1em)
    #context {
      let vmap = (:)
      for m in query(<vm>) { vmap.insert(m.value, m.location()) }
      let relPage = loc => {
        let pstart = 0
        for m in query(<pm>) { if m.location().page() <= loc.page() { pstart = m.location().page() } }
        loc.page() - pstart
      }
      columns(2, gutter: 1.4em)[
        #for e in doc.tagIndex [
          #text(weight: "bold")[#e.name]#h(0.4em)#{
            // resolve each ref to (display string, location); dedup identical displays
            let seen = (:)
            let items = ()
            for r in e.refs {
              // Same document: link straight to the location, page relative to
              // its Part. Split build: the target lives in another PDF, so use
              // the caller-supplied absolute page and a cross-file marker that
              // the merge step turns into a real jump.
              let loc = vmap.at(r.key, default: none)
              let abs = pagemap.at(r.key, default: none)
              let showp = r.at("showPage", default: false)
              let disp = if showp and loc != none {
                r.label + ", p. " + str(relPage(loc))
              } else if showp and abs != none {
                r.label + ", p. " + str(abs)
              } else { r.label }
              if disp in seen { continue }
              seen.insert(disp, true)
              let body = text(fill: notegray)[#disp]
              items.push(
                if loc != none { link(loc, body) }
                else if abs != none { link("ttref://" + r.key, body) }
                else { body },
              )
            }
            items.join(";  ")
          }
          #parbreak()
        ]
      ]
    }
  ]
}

// ---- assembly ----------------------------------------------------------------

#if mode == "full" or mode == "front" {
  title-page()
  copyright-page()
  stats-page()
  parts-page()
}

#let gcw = colw  // (was narrower; keeping equal for now so margin notes align)

#let render-scripture-part(part) = {
  let curbook = ""
  for (ci, ch) in part.chapters.enumerate() {
    if ch.book != curbook {
      curbook = ch.book
      heading(level: 2)[#ch.book]
    }
    mdebt.update(0pt)
    [#metadata(ch.reference)<rh>]
    if ch.verses.len() == 0 { continue }
    let cw-word = ch.at("chapterWord", default: "Chapter")
    v(if ci == 0 { 0.10in } else { 0.42in })
    block(breakable: false, {
      heading(level: 3)[#cw-word #ch.chapter]
      [#metadata(ckey(part.key, ch.book, ch.chapter))<cm>]
      align(center, box(width: colw)[#align(center,
        text(font: sans, size: 12pt, weight: "medium", tracking: 0.08em, fill: rgb("#4a4238"), number-type: "lining")[#cw-word #ch.chapter])])
      v(0.2in)
      verse(part.key, ch.book, ch.chapter, ch.verses.first())
    })
    if ch.verses.len() > 1 {
      for vv in ch.verses.slice(1) { verse(part.key, ch.book, ch.chapter, vv) }
    }
  }
}

#let render-gc-part(part) = {
  for (ci, conf) in part.conferences.enumerate() {
    heading(level: 2)[#conf.label]
    v(if ci == 0 { 0.10in } else { 0.5in })
    align(center, text(font: sans, size: 13pt, weight: "medium", tracking: 0.14em, fill: rgb("#4a4238"))[#upper(conf.label)])
    v(0.3in)
    for talk in conf.talks {
      let tkey = part.key + "|" + conf.key + "|" + talk.slug
      mdebt.update(0pt)
      [#metadata(talk.title)<rh>]
      v(0.34in)
      block(breakable: false, {
        heading(level: 3)[#talk.title]
        [#metadata(tkey)<cm>]
        set par(justify: false)
        align(center, box(width: gcw, {
          text(font: sans, size: 13pt, weight: "medium", tracking: 0.01em)[#talk.title]
          linebreak()
          v(0.4em)
          text(font: sans, size: 8.5pt, fill: notegray)[#talk.speaker]
          if talk.role != none {
            linebreak(); text(font: sans, size: 7.5pt, fill: tagcol)[#talk.role]
          }
        }))
        v(0.24in)
        if talk.paragraphs.len() > 0 {
          unit(tkey + "|" + talk.paragraphs.first().ref, talk.paragraphs.first(), kind: "para", cw: gcw)
        }
      })
      for p in talk.paragraphs.slice(1) {
        unit(tkey + "|" + p.ref, p, kind: "para", cw: gcw)
      }
    }
  }
}

// ---- notebooks (curated collections) --------------------------------------

// full-width verse: notes render inline below, not in a margin
#let nb-verse(vs) = {
  set par(hanging-indent: 1.0em, justify: true)
  if vs.gapBefore { v(0.3em); align(center, text(fill: gapmark, size: 9pt)[⋯]); v(0.3em) }
  text(size: 8pt, fill: vnumcol)[#vs.num]
  h(0.4em)
  for r in vs.runs { render-run(r) }
  parbreak()
  for n in vs.notes {
    pad(left: 1.2em, {
      set text(size: 8.5pt, fill: notegray)
      set par(justify: false, hanging-indent: 0pt, leading: 0.5em)
      if n.title != none { text(style: "italic", weight: "bold")[#n.title]; linebreak() }
      render-note-body(n.body)
      if n.tags.len() > 0 {
        linebreak()
        text(size: 6.6pt, tracking: 0.08em, fill: tagcol)[#smallcaps(n.tags.join("  ·  "))]
      }
    })
    v(0.3em)
  }
}

#let render-notebooks-part(part) = {
  for (ni, nb) in part.notebooks.enumerate() {
    heading(level: 2)[#nb.name]
    [#metadata(part.key + "|" + nb.name)<cm>]
    [#metadata(nb.name)<rh>]
    v(if ni == 0 { 0.15in } else { 0.55in })
    align(center, text(font: sans, size: 14pt, weight: "medium", tracking: 0.06em, fill: rgb("#4a4238"))[#nb.name])
    if nb.description != none {
      v(0.18in)
      pad(x: 0.5in, {
        set par(justify: false, leading: 0.55em)
        set text(size: 9pt, style: "italic", fill: notegray)
        render-note-body(nb.description)
      })
    }
    v(0.32in)
    for (ei, e) in nb.entries.enumerate() {
      if ei > 0 {
        v(0.4em)
        align(center, box(width: 24%, line(length: 100%, stroke: 0.3pt + gapmark)))
        v(0.4em)
      }
      block(breakable: true, {
        if e.kind == "text" {
          set par(justify: false, leading: 0.56em)
          h(1fr); text(font: sans, size: 6.5pt, fill: tagcol, number-type: "lining")[#e.created]; linebreak()
          if e.title != none { text(font: sans, size: 9.5pt, weight: "medium")[#e.title]; parbreak() }
          render-note-body(e.body)
        } else if e.kind == "passage" {
          text(font: sans, size: 8pt, tracking: 0.03em, fill: tagcol)[#e.refLabel]
          parbreak()
          for v in e.verses { nb-verse(v) }
        } else if e.kind == "citation" {
          set par(justify: false, leading: 0.5em)
          // body serif, not `sans`: Marcellus has no italic, and a cited
          // source reads properly in a real italic anyway
          text(size: 8.5pt, fill: notegray, style: "italic")[#e.refLabel]
          if e.note != none {
            parbreak(); set text(size: 8.5pt, fill: notegray); e.note
          }
        }
      })
    }
  }
}

#if mode == "full" or mode == "part" {
  for part in doc.parts {
    if not continued {
      plain-page({
        heading(level: 1)[#part.title]
        [#metadata(pkey(part.key))<pm>]
        v(2.6in)
        align(center, anchor(pkey(part.key),
          text(font: sans, size: 17pt, weight: "medium", tracking: 0.16em)[#upper(part.title)]))
      })
      part-toc(part)
    }
    if part.kind == "notebooks" { render-notebooks-part(part) }
    else if part.kind == "scripture" { render-scripture-part(part) }
    else if part.kind == "gc" { render-gc-part(part) }
  }
}

// "back" is its own mode (not just folded into "front") so that when the
// browser generator concatenates front + parts + back into one PDF, the
// unplaced-notes/tag-index pages land at the actual end of the book instead
// of right after the front matter.
#if mode == "full" or mode == "back" {
  unplaced-notes-section()
  tag-index()
}
