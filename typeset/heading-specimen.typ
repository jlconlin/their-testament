// Heading-font comparison. Body is always Adobe Garamond Pro; each block tries a
// different face for the headings/titles, in a realistic mini-layout.

#set page(width: 8.5in, height: 11in, margin: 0.6in)
#set text(font: "Adobe Garamond Pro", size: 10.5pt, fill: rgb("#1a1712"), number-type: "old-style")
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

#align(center, text(font: "Adobe Garamond Pro", size: 13pt, tracking: 0.1em)[Heading-font comparison])
#align(center, text(size: 8.5pt, fill: gray)[body is Adobe Garamond Pro throughout])
#v(10pt)

#specimen("Adobe Garamond Pro (all-serif; headings only differ by caps + size)", "Adobe Garamond Pro")
#specimen("Minion Pro (a second serif)", "Minion Pro")
#specimen("Optima (humanist, flared — bridges serif & sans)", "Optima")
#specimen("Gill Sans (current)", "Gill Sans")
#specimen("Avenir Next", "Avenir Next")
#specimen("Futura", "Futura")
#specimen("Proxima Nova", "Proxima Nova")
#specimen("Helvetica Neue", "Helvetica Neue")
#specimen("Palatino (serif, wide)", "Palatino")
#specimen("Charter (serif, sturdy)", "Charter")
