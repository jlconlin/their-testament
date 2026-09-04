# `annotations.json` — the interchange & preservation format

The generator has exactly one input contract: **given a valid `annotations.json`
file, make the book.** Whatever produced the file — the bookmarklet (M5), a
manual dev-tools paste, a future browser extension — is irrelevant to
generation. This document is that contract.

Two audiences:

- **The generator.** Reads the file, builds the PDF, never touches the Church
  annotation API itself.
- **Preservation.** The JSON is the durable machine artifact; the PDF is the
  durable *readable* one. Keep both. The JSON must still be loadable years from
  now, by a generator newer than the file.

Reference implementation: [`src/envelope.ts`](../src/envelope.ts).
Validate a file: `npx tsx scripts/check-export.ts <file>`.

---

## Shape

```jsonc
{
  "format": "their-testament",                // exact string, identifies the file
  "version": 1,                               // envelope structure version (integer)
  "exportedAt": "2026-09-02T03:47:22.046Z",   // ISO 8601 instant the export was taken
  "source": {                                 // provenance; all fields optional
    "origin": "https://www.churchofjesuschrist.org",
    "api": "study/api/v3/annotationsWithMeta",
    "locale": "eng",
    "personId": "0000000000000000",           // the Church person id (also in every record)
    "exporter": "their-testament-bookmarklet/0.1"
  },
  "counts": {                                 // advisory; the generator recomputes
    "total": 12043,
    "byType": { "highlight": 11890, "reference": 140, "journal": 13 }
  },
  "annotations": [ /* raw Church annotation records, unmodified — see below */ ]
}
```

### `format`

Always the literal `"their-testament"`. This is a machine identifier that
happens to match the project name (decision 35 in
[`decisions.md`](decisions.md)); once public it stays stable so old files keep
validating. The pre-1.0 name `"gospel-library-preservation"` is still accepted
on read with a warning and normalised to `"their-testament"`. Any other
`format` is rejected.

### `version`

The version of **this envelope's structure** — the keys documented here. It
bumps only when the envelope changes (a new required field, a renamed key). It
does **not** bump when the Church changes an annotation record's fields; those
records are passed through verbatim and version themselves via their own
`contentVersion`.

A generator declares which envelope versions it reads (`SUPPORTED_VERSIONS`).
Current: `[1]`.

### `exportedAt`

ISO 8601. When the annotations were actually pulled. For a historical dump with
no known pull time, the newest `lastUpdated` across the records is an acceptable
substitute (this is what `scripts/wrap-export.ts` does).

### `source`

Free-form provenance. Every field optional; unknown fields allowed and
preserved. `personId` may be `null` if a future exporter scrubs it — but note it
already appears in every record.

### `counts`

Advisory only, for a human glancing at the file. The generator **recomputes**
`total` and `byType` from `annotations` and trusts its own numbers; a mismatch
is a warning, not an error.

### `annotations`

An array of annotation records **in the Church's exact v3 shape**, as returned
by `study/api/v3/annotationsWithMeta`. We do not rename, flatten, reorder, or
drop fields. Unknown / future fields are carried through untouched so a record
can round-trip through a generator that predates it.

A record the generator relies on looks like:

```jsonc
{
  "annotationId": "00000000-0000-0000-0000-000000000000",  // REQUIRED — stable identity
  "type": "highlight",                    // "highlight" | "reference" | "journal" | …
  "created": "2024-05-01T12:00:00.000Z",
  "lastUpdated": "2024-05-01T12:00:30.000Z",
  "locale": "eng",
  "docId": "000000000",
  "uri": "/scriptures/bofm/alma/32",
  "note": { "title": "…", "content": "<p>…</p>" },   // optional
  "highlights": [                                     // optional; [] for a pure note
    {
      "uri": "/scriptures/bofm/alma/32.p21",
      "pid": "000000000",
      "color": "red",                    // 11 values incl. "clear" (= no visual mark)
      "style": "red-underline",           // present ⇒ underline; absent ⇒ fill
      "startOffset": -1,                  // 1-indexed word; -1 = from start
      "endOffset": 24                     //               -1 = through end
    }
  ],
  "tags": [ { "tagId": "…", "name": "Law of Sacrifice", "created": "…", "timestamp": "…" } ],
  "folders": [ { "folderId": "…", "name": "…", "orderedAnnotationIds": [ … ] } ]
}
```

Field semantics (offsets, the `clear` colour, the `style` misnomer, verse-ref
derivation) are documented in [`src/types.ts`](../src/types.ts) and
[`m3-validation.md`](m3-validation.md).

---

## Validation

`validateEnvelope(parsedJson)` returns `{ ok, version, wrappedLegacy, errors,
warnings, envelope }`.

**Errors** (file rejected):

- top-level is not an object or array
- `format` is neither `"their-testament"` nor an accepted legacy name
- `version` missing / not an integer / not in `SUPPORTED_VERSIONS`
- `annotations` missing or not an array
- a record is not an object
- one or more records missing a string `annotationId`
- a record's `highlights` / `tags` / `folders` is present but not an array

**Warnings** (file used as-is):

- `exportedAt` missing or not ISO 8601
- `source` present but not an object
- `counts.total` disagrees with the actual record count
- a record has no `type`
- duplicate `annotationId`
- a date field is not ISO 8601

The philosophy: strict on the envelope and on record **identity**; lenient on
everything else. Messy records are the generator's job to survive — M3 proved it
reconstructs 99.08 % of the real corpus cleanly and reports the rest — not the
loader's job to reject.

### Legacy bare arrays

A file that is just a top-level `[ … ]` of records (an old dump, a raw
dev-tools copy) is accepted: it's wrapped as version 1 with
`wrappedLegacy: true` and a warning. Prefer a real envelope — only the envelope
carries `exportedAt` and `source`, which preservation needs.

---

## Tooling

| command | does |
|---|---|
| `npx tsx scripts/check-export.ts <file>` | validate, print report, exit 1 if rejected |
| `npx tsx scripts/wrap-export.ts <in> <out> [--exporter <name>] [--exported-at <iso>]` | wrap a bare array (or re-wrap) into a v1 envelope |

The dev/build scripts (`validate.ts`, `build-job.ts`, `build-gc.ts`) load their
input through [`scripts/_data.ts`](../scripts/_data.ts), which prefers
`data/raw/2026-09-02/export.json` and falls back to the legacy
`annotations.json`.

---

## Changelog

- **v1** (2026-09-03) — initial format.
