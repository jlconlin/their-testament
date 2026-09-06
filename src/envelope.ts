// ---------------------------------------------------------------------------
// annotations.json — the versioned interchange + preservation envelope
// ---------------------------------------------------------------------------
//
// The generator's only input contract. Whatever acquires the annotations
// (the bookmarklet, a manual dev-tools paste, a future extension) writes a
// file in this shape; the generator reads it and never talks to the Church
// API for annotations again.
//
// Design rules:
//   * The annotation RECORDS stay in the Church's exact v3 shape. We do not
//     rename, flatten, or drop fields — unknown fields are preserved so a
//     newer API can round-trip through an older generator.
//   * The ENVELOPE is ours and is versioned. `version` bumps only when the
//     envelope's own structure changes, never when the Church changes an
//     annotation field.
//   * Validation is strict about the envelope and about each record's
//     identity (`annotationId`), lenient about everything else — messy
//     records are the generator's job to survive (full-corpus validation
//     bore this out), not the loader's job to reject.
//
// Spec: docs/annotations-format.md
// ---------------------------------------------------------------------------

import type { Annotation } from "./types.ts";

export const ENVELOPE_FORMAT = "their-testament";
export const ENVELOPE_VERSION = 1;
export const SUPPORTED_VERSIONS: readonly number[] = [1];

/** Older `format` strings still accepted on read (with a warning). */
const LEGACY_FORMATS: readonly string[] = ["gospel-library-preservation"];

export interface EnvelopeSource {
  /** "https://www.churchofjesuschrist.org" */
  origin?: string;
  /** the endpoint the records came from, e.g. "study/api/v3/annotationsWithMeta" */
  api?: string;
  /** annotation locale requested, e.g. "eng" */
  locale?: string;
  /** the Church person id (present in every record too); may be null if scrubbed */
  personId?: string | null;
  /** what produced the file, e.g. "their-testament-bookmarklet/0.1" or "manual" */
  exporter?: string;
}

export interface AnnotationEnvelope {
  format: typeof ENVELOPE_FORMAT;
  version: number;
  /** ISO 8601 instant the export was taken */
  exportedAt: string;
  source: EnvelopeSource;
  counts: { total: number; byType: Record<string, number> };
  annotations: Annotation[];
}

export interface ValidationResult {
  ok: boolean;
  /** the envelope version seen (or 1 when a bare legacy array was wrapped); null if unreadable */
  version: number | null;
  /** true when the input was a bare array rather than a real envelope */
  wrappedLegacy: boolean;
  errors: string[];
  warnings: string[];
  /** populated whenever `ok` — the normalized envelope ready for the generator */
  envelope: AnnotationEnvelope | null;
}

// --- building --------------------------------------------------------------

function countByType(annotations: Annotation[]): Record<string, number> {
  const by: Record<string, number> = {};
  for (const a of annotations) {
    const t = typeof a?.type === "string" && a.type ? a.type : "unknown";
    by[t] = (by[t] ?? 0) + 1;
  }
  return by;
}

/** Wrap raw annotation records in a fresh version-1 envelope. */
export function wrapAnnotations(
  annotations: Annotation[],
  source: EnvelopeSource = {},
  exportedAt: string = new Date().toISOString(),
): AnnotationEnvelope {
  return {
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    exportedAt,
    source,
    counts: { total: annotations.length, byType: countByType(annotations) },
    annotations,
  };
}

// --- validation -----------------------------------------------------------

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function validateRecords(annotations: unknown[], errors: string[], warnings: string[]): void {
  const seen = new Set<string>();
  let missingId = 0, badHighlights = 0, badTags = 0, badFolders = 0, badDates = 0;

  annotations.forEach((a, i) => {
    if (a === null || typeof a !== "object" || Array.isArray(a)) {
      errors.push(`annotations[${i}] is not an object`);
      return;
    }
    const rec = a as Record<string, unknown>;

    const id = rec.annotationId;
    if (typeof id !== "string" || id === "") {
      missingId++;
    } else if (seen.has(id)) {
      warnings.push(`duplicate annotationId ${id} (records ${i} and earlier)`);
    } else {
      seen.add(id);
    }

    if (typeof rec.type !== "string" || rec.type === "") {
      warnings.push(`annotations[${i}] has no type`);
    }
    if ("highlights" in rec && rec.highlights != null && !Array.isArray(rec.highlights)) badHighlights++;
    if ("tags" in rec && rec.tags != null && !Array.isArray(rec.tags)) badTags++;
    if ("folders" in rec && rec.folders != null && !Array.isArray(rec.folders)) badFolders++;
    for (const k of ["created", "lastUpdated"] as const) {
      const v = rec[k];
      if (typeof v === "string" && v !== "" && !ISO_RE.test(v)) badDates++;
    }
  });

  if (missingId) errors.push(`${missingId} record(s) missing a string annotationId`);
  if (badHighlights) errors.push(`${badHighlights} record(s) have a non-array \`highlights\``);
  if (badTags) errors.push(`${badTags} record(s) have a non-array \`tags\``);
  if (badFolders) errors.push(`${badFolders} record(s) have a non-array \`folders\``);
  if (badDates) warnings.push(`${badDates} date field(s) are not ISO 8601`);
}

/**
 * Validate arbitrary parsed JSON as an annotations envelope.
 *
 * Accepts three inputs:
 *   1. a real envelope   → validated as-is
 *   2. a bare array of records (legacy / dev-tools paste) → wrapped as v1,
 *      `wrappedLegacy: true`, one warning
 *   3. anything else      → `ok: false` with errors
 */
export function validateEnvelope(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // (2) bare array
  if (Array.isArray(raw)) {
    warnings.push(
      "input is a bare annotation array, not an envelope — wrapping as version 1; " +
        "prefer a real annotations.json envelope (see docs/annotations-format.md)",
    );
    validateRecords(raw, errors, warnings);
    if (errors.length) return { ok: false, version: null, wrappedLegacy: true, errors, warnings, envelope: null };
    return {
      ok: true,
      version: ENVELOPE_VERSION,
      wrappedLegacy: true,
      errors,
      warnings,
      envelope: wrapAnnotations(raw as Annotation[], { exporter: "legacy-bare-array" }),
    };
  }

  // (3) not an object
  if (raw === null || typeof raw !== "object") {
    return { ok: false, version: null, wrappedLegacy: false, errors: ["top-level value is not an object or array"], warnings, envelope: null };
  }

  const env = raw as Record<string, unknown>;

  if (env.format !== ENVELOPE_FORMAT) {
    if (typeof env.format === "string" && LEGACY_FORMATS.includes(env.format)) {
      warnings.push(`format ${JSON.stringify(env.format)} is a legacy name; current is ${JSON.stringify(ENVELOPE_FORMAT)}`);
    } else {
      errors.push(`format is ${JSON.stringify(env.format)}, expected ${JSON.stringify(ENVELOPE_FORMAT)}`);
    }
  }

  let version: number | null = null;
  if (typeof env.version !== "number" || !Number.isInteger(env.version)) {
    errors.push(`version is ${JSON.stringify(env.version)}, expected an integer`);
  } else {
    version = env.version;
    if (!SUPPORTED_VERSIONS.includes(version)) {
      errors.push(`envelope version ${version} is not supported (this build reads ${SUPPORTED_VERSIONS.join(", ")})`);
    }
  }

  if (typeof env.exportedAt !== "string" || !ISO_RE.test(env.exportedAt)) {
    warnings.push(`exportedAt is ${JSON.stringify(env.exportedAt)}, expected an ISO 8601 string`);
  }

  if (env.source != null && (typeof env.source !== "object" || Array.isArray(env.source))) {
    warnings.push("source is present but not an object — ignoring");
  }

  if (!Array.isArray(env.annotations)) {
    errors.push("annotations is missing or not an array");
    return { ok: false, version, wrappedLegacy: false, errors, warnings, envelope: null };
  }

  validateRecords(env.annotations, errors, warnings);

  const annotations = env.annotations as Annotation[];
  if (env.counts && typeof env.counts === "object" && !Array.isArray(env.counts)) {
    const declared = (env.counts as Record<string, unknown>).total;
    if (typeof declared === "number" && declared !== annotations.length) {
      warnings.push(`counts.total says ${declared} but there are ${annotations.length} records`);
    }
  }

  if (errors.length) return { ok: false, version, wrappedLegacy: false, errors, warnings, envelope: null };

  const source: EnvelopeSource =
    env.source && typeof env.source === "object" && !Array.isArray(env.source) ? (env.source as EnvelopeSource) : {};

  return {
    ok: true,
    version,
    wrappedLegacy: false,
    errors,
    warnings,
    // re-derive counts so downstream code can trust them
    envelope: {
      format: ENVELOPE_FORMAT,
      version: version!,
      exportedAt: typeof env.exportedAt === "string" ? env.exportedAt : new Date(0).toISOString(),
      source,
      counts: { total: annotations.length, byType: countByType(annotations) },
      annotations,
    },
  };
}

/**
 * Validate and return the envelope, or throw with every error. Warnings are
 * passed to `onWarn` (default: console.warn). This is the function build
 * scripts and the generator should call.
 */
export function readEnvelope(
  raw: unknown,
  onWarn: (msg: string) => void = (m) => console.warn(`  ⚠ ${m}`),
): AnnotationEnvelope {
  const result = validateEnvelope(raw);
  for (const w of result.warnings) onWarn(w);
  if (!result.ok || !result.envelope) {
    throw new Error(`invalid annotations export:\n  - ${result.errors.join("\n  - ")}`);
  }
  return result.envelope;
}
