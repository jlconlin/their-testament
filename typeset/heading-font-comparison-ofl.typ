// Heading-font comparison, OFL candidates only (M6 needs fonts we can legally
// serve to the public from a browser app). Body is EB Garamond throughout
// (already decided -- a near drop-in for the old Adobe Garamond Pro body);
// each block tries a different OFL face for headings/titles, in the same
// mini-layout as the earlier commercial-font comparison
// (heading-specimen.typ), so the two are easy to compare side by side.
//
// Compile with the downloaded OFL files on the font path, e.g.:
//   typst compile --font-path typeset/ofl-fonts typeset/heading-font-comparison-ofl.typ

#set page(width: 8.5in, height: 11in, margin: 0.6in)
#set text(font: "EB Garamond", size: 10.5pt, fill: rgb("#1a1712"), number-type: "old-style")
#set par(justify: true, leading: 0.58em)

#let bodytext = [
  #text(size: 8pt, fill: rgb("#9c9081"))[27] So God created man in his #emph[own] image, in the
  image of God created he him; #underline(stroke: 1pt + rgb("#FE4F66"))[male and female created he
  them.] #text(size: 8pt, fill: rgb("#9c9081"))[28] And God blessed them, and God said unto them,
  Be fruitful, and multiply, and replenish the earth, and subdue #emph[it].
]

#let brown = rgb("#4a4238")
#let gray = rgb("#8a8378")

#let specimen(label, face, opts: (:)) = block(breakable: false, width: 100%, inset: (y: 6pt), {
  set text(..opts)
  // running head
  text(font: face, size: 7.5pt, tracking: 0.16em, fill: gray)[GENESIS 1 #h(1fr) 3]
  line(length: 100%, stroke: 0.3pt + rgb("#ddd6c8"))
  v(6pt)
  grid(columns: (1.9in, 1fr), gutter: 18pt,
    // left: part title + talk title samples
    {
      text(font: face, size: 13pt, weight: "medium", tracking: 0.12em, fill: brown)[OLD TESTAMENT]
      v(9pt)
      text(font: face, size: 12pt, weight: "medium")[The Gift of Grace]
      linebreak()
      text(font: face, size: 8pt, fill: gray)[Dieter F. Uchtdorf]
      v(10pt)
      text(size: 7pt, fill: gray)[— #label —]
    },
    // right: chapter heading + body
    {
      align(center, text(font: face, size: 13pt, weight: "medium", tracking: 0.08em, fill: brown, number-type: "lining")[Chapter 32])
      v(10pt)
      bodytext
    },
  )
})

#align(center, text(font: "EB Garamond", size: 13pt, tracking: 0.1em)[Heading-font comparison — OFL candidates])
#align(center, text(size: 8.5pt, fill: gray)[body is EB Garamond throughout; every face below is freely licensed (SIL OFL)])
#v(10pt)

#specimen("No contrasting font — EB Garamond, tracked caps (decisions.md's suggested fallback)", "EB Garamond",
  opts: (tracking: 0.1em))
#specimen("Fraunces (already the site's own display serif — warm, a little idiosyncratic)", "Fraunces")
#specimen("Spectral (contemporary serif, close kin to the body)", "Spectral")
#specimen("Cormorant Garamond (elegant, thin — same family lineage as the body)", "Cormorant Garamond")
#specimen("Jost (geometric sans, Kabel-inspired — the most commonly cited free Optima-alternative)", "Jost")
#specimen("Montserrat (geometric sans, very neutral, extremely well supported)", "Montserrat")
#specimen("Nunito Sans (humanist, rounded terminals — the warmest of the sans options)", "Nunito Sans 12pt")
#specimen("Libre Franklin (grotesque/humanist workhorse, neutral)", "Libre Franklin")
#specimen("Barlow (humanist grotesque, slightly condensed, a bit of warmth)", "Barlow")
#specimen("Public Sans (civic/humanist, plain and professional)", "Public Sans")
#specimen("Questrial (geometric, single-weight, retro-futurist feel)", "Questrial")
