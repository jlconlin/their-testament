// Gospel Library keepsake — book template (Milestone 1: scripture Parts).
// Consumes doc.json (DocBook).

#let doc = json(sys.inputs.at("doc", default: "doc.json"))

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
#let ink = rgb("#1a1712")
#let notegray = rgb("#544f49")
#let tagcol = rgb("#8a7f6f")
#let headcol = rgb("#8a8378")
#let vnumcol = rgb("#8f2704")
#let gapmark = rgb("#bcb4a6")

#let mdebt = state("mdebt", 0pt)

#let vkey(part, ch, ref) = part + "|" + str(ch) + "|" + ref
#let ckey(part, ch) = part + "|" + str(ch)
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
    let cur = none
    for m in query(<rh>) { if m.location().page() <= hp { cur = m.value } }
    if cur == none { return }
    let pstart = 0
    for m in query(<pm>) { if m.location().page() <= hp { pstart = m.location().page() } }
    let folio = hp - pstart
    set text(size: 8pt, tracking: 0.14em, fill: headcol, number-type: "lining")
    box(width: colw)[#smallcaps(upper(cur)) #h(1fr) #if folio > 0 [#folio]]
  },
  header-ascent: 45%,
)
#set text(font: "Adobe Garamond Pro", size: 10.5pt, fill: ink, lang: "en", number-type: "old-style")
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
      for (j, it) in b.items.enumerate() {
        if j > 0 { linebreak() }
        let marker = if b.t == "ul" { [•] } else { [#(j + 1).] }
        grid(columns: (1em, 1fr), gutter: 0.3em, marker, render-inline(it))
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
    text(size: 8pt, fill: vnumcol)[#vs.num]
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

#let verse(part, chnum, vs) = unit(vkey(part, chnum, vs.ref), vs, kind: "verse")

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
    text(size: 20pt, tracking: 0.04em)[#doc.at("title", default: "The Marked Scriptures")]
    if doc.personName != none { v(0.5em); text(size: 13pt, fill: notegray)[#doc.personName] }
  })
  v(1fr)
  align(center, text(size: 9pt, fill: headcol, number-type: "lining")[#doc.generatedAt.slice(0, 10)])
})

#let stats-page() = plain-page({
  v(1.6in)
  align(center, text(size: 13pt, tracking: 0.16em)[#smallcaps("An Overview")])
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

#let toc-page() = plain-page(context {
  v(1.1in)
  align(center, text(size: 13pt, tracking: 0.16em)[#smallcaps("Contents")])
  v(0.5in)
  set par(justify: false, leading: 0.42em, spacing: 0.42em)
  let cmOf = m => {
    let q = query(<cm>).filter(x => x.value == m)
    if q.len() > 0 { q.first().location() } else { none }
  }
  let relPage = loc => {
    if loc == none { return none }
    let pstart = 0
    for m in query(<pm>) { if m.location().page() <= loc.page() { pstart = m.location().page() } }
    loc.page() - pstart
  }
  let tocrow(indent, body, loc) = block(above: 0.28em, below: 0.28em, pad(left: indent, box(width: 100% - indent, {
    if loc != none { link(loc, body) } else { body }
    let p = relPage(loc)
    if p != none [#h(1fr)#text(size: 8pt, fill: notegray, number-type: "lining")[#p]]
  })))
  for part in doc.parts {
    let pl = query(<pm>).filter(x => x.value == pkey(part.key))
    let ploc = if pl.len() > 0 { pl.first().location() } else { none }
    block(above: 0.9em, below: 0.3em,
      if ploc != none { link(ploc)[#text(weight: "bold")[#part.title]] } else { text(weight: "bold")[#part.title] })
    if part.kind == "scripture" {
      let books = ()
      for ch in part.chapters {
        if books.len() == 0 or books.last().at(0) != ch.book { books.push((ch.book, ())) }
        books.last().at(1).push(ch)
      }
      for (bname, chs) in books {
        let bloc = cmOf(ckey(part.key, chs.first().chapter))
        tocrow(1em, text(size: 9.5pt)[#bname], bloc)
        block(above: 0em, below: 0.28em, pad(left: 2em, text(size: 8pt, fill: notegray, number-type: "lining")[
          #text(fill: tagcol)[chapters ] #chs.map(ch => {
            let cloc = cmOf(ckey(part.key, ch.chapter))
            if cloc != none { link(cloc)[#str(ch.chapter)] } else { str(ch.chapter) }
          }).join(", ")
        ]))
      }
    } else if part.kind == "gc" {
      for conf in part.conferences {
        block(above: 0.5em, below: 0.2em, pad(left: 1em, text(size: 9pt, style: "italic")[#conf.label]))
        for talk in conf.talks {
          let cloc = cmOf(part.key + "|" + conf.key + "|" + talk.slug)
          tocrow(2em,
            [#text(size: 8.5pt)[#talk.title]#text(size: 8pt, fill: notegray)[ · #talk.speaker]],
            cloc)
        }
      }
    }
  }
  v(0.7em)
  let il = query(<im>)
  let iloc = if il.len() > 0 { il.first().location() } else { none }
  if iloc != none { link(iloc)[#text(weight: "bold")[Tag Index]] } else { text(weight: "bold")[Tag Index] }
})

// ---- tag index (one, combined, at the back) ------------------------------

#let tag-index() = {
  page(numbering: none, margin: matter-margin, header: context {
    set text(size: 8pt, tracking: 0.14em, fill: headcol)
    smallcaps("Tag Index")
  })[
    #{
      heading(level: 1)[Tag Index]
      [#metadata("tag-index")<im>]
    }
    #v(0.5in)
    #align(center, text(size: 13pt, tracking: 0.16em)[#smallcaps("Tag Index")])
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
              if r.key not in vmap { continue }
              let l = vmap.at(r.key)
              let disp = if r.at("showPage", default: false) { r.label + ", p. " + str(relPage(l)) } else { r.label }
              if disp in seen { continue }
              seen.insert(disp, true)
              items.push(link(l)[#text(fill: notegray)[#disp]])
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

#title-page()
#stats-page()
#toc-page()

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
      [#metadata(ckey(part.key, ch.chapter))<cm>]
      align(center, box(width: colw)[#align(center,
        text(size: 12pt, tracking: 0.10em, fill: rgb("#4a4238"), number-type: "lining")[#cw-word #ch.chapter])])
      v(0.2in)
      verse(part.key, ch.chapter, ch.verses.first())
    })
    if ch.verses.len() > 1 {
      for vv in ch.verses.slice(1) { verse(part.key, ch.chapter, vv) }
    }
  }
}

#let render-gc-part(part) = {
  for (ci, conf) in part.conferences.enumerate() {
    heading(level: 2)[#conf.label]
    v(if ci == 0 { 0.10in } else { 0.5in })
    align(center, text(size: 13pt, tracking: 0.14em, fill: rgb("#4a4238"))[#smallcaps(conf.label)])
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
          text(size: 12.5pt, tracking: 0.02em)[#talk.title]
          linebreak()
          v(0.35em)
          text(size: 8.5pt, fill: notegray, style: "italic")[By #talk.speaker]
          if talk.role != none {
            linebreak(); text(size: 7.5pt, fill: tagcol)[#talk.role]
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

#for part in doc.parts {
  plain-page({
    heading(level: 1)[#part.title]
    [#metadata(pkey(part.key))<pm>]
    v(2.6in)
    align(center, text(size: 18pt, tracking: 0.18em)[#smallcaps(part.title)])
  })
  if part.kind == "scripture" { render-scripture-part(part) }
  else if part.kind == "gc" { render-gc-part(part) }
}

#tag-index()
