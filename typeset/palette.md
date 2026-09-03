# Gospel Library highlight palette

Pulled from the churchofjesuschrist.org study-view CSS custom properties
(light theme), 2026-09-02.

Each mark has a **base color**. The app renders:
- **fill** ("highlight" style) = base color at low alpha over the page
- **underline** (`style: "red-underline"`, actually just "underline") = base color at 100%

For print/PDF on white paper we flatten the fill to an opaque tint so CMYK
output is predictable.

| name       | base (underline) | app fill (RGBA) | fill flattened / white |
|------------|------------------|-----------------|------------------------|
| red        | `#FE4F66`        | `#FE4F66` @ 20% | `#FFDCE0`              |
| pink       | `#F85BEA`        | `#F85BEA` @ 20% | `#FEDEFB`              |
| orange     | `#FE9829`        | `#FE9829` @ 24% | `#FFE6CC`              |
| yellow     | `#FCDB3B`        | `#FCDB3B` @ 38% | `#FEF1B4`              |
| green      | `#A9D527`        | `#A9D527` @ 24% | `#EAF5CB`              |
| blue       | `#10D9E1`        | `#10D9E1` @ 20% | `#CFF7F9`              |
| dark_blue  | `#2596FF`        | `#2596FF` @ 16% | `#DCEEFF`              |
| purple     | `#9D53FE`        | `#9D53FE` @ 16% | `#EFE3FF`              |
| brown      | `#CD7D5A`        | `#CD7D5A` @ 20% | `#F5E5DE`              |
| gray       | `#AEB8C1`        | `#AEB8C1` @ 24% | `#ECEEF0`              |
| clear      | `#FFFFFF`        | none            | none (marker only)     |

Notes:
- `dark_blue` and `blue` are distinct base hues (`#2596FF` vs cyan `#10D9E1`).
- `clear` = highlighted with no color. Renders as neither fill nor underline;
  we'll mark it some other way (thin rule / bracket) — TBD.
- The 8-digit hex in the CSS is `#RRGGBBAA`; alpha shown above as a percentage.
- Dark-theme variants exist in the CSS too if we ever want a dark PDF.
