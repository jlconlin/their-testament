// Shared: locate and load the local annotations export for the dev/build
// scripts. Prefers a real `export.json` envelope, falls back to the legacy
// bare `annotations.json` (which `readEnvelope` wraps with a warning).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readEnvelope, type AnnotationEnvelope } from "../src/envelope.ts";

const ROOT = resolve(import.meta.dirname, "..");
const DIR = resolve(ROOT, "data/raw/2026-09-02");

export function loadExport(): AnnotationEnvelope {
  const path = ["export.json", "annotations.json"]
    .map((f) => resolve(DIR, f))
    .find((p) => existsSync(p));
  if (!path) throw new Error(`no export found in ${DIR} (export.json or annotations.json)`);
  return readEnvelope(JSON.parse(readFileSync(path, "utf8")));
}
