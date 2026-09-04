// Wrap a bare annotation array (dev-tools paste, legacy dump) in a proper
// versioned envelope.
//
//   npx tsx scripts/wrap-export.ts <in.json> <out.json> [--exporter <name>]
//
// Spec: docs/annotations-format.md

import { readFileSync, writeFileSync } from "node:fs";
import { wrapAnnotations, validateEnvelope, type EnvelopeSource } from "../src/envelope.ts";
import type { Annotation } from "../src/types.ts";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: npx tsx scripts/wrap-export.ts <in.json> <out.json> [--exporter <name>]");
  process.exit(2);
}
const exporterIdx = process.argv.indexOf("--exporter");
const exporter = exporterIdx > -1 ? process.argv[exporterIdx + 1] : "manual";
const exportedAtIdx = process.argv.indexOf("--exported-at");
const exportedAtArg = exportedAtIdx > -1 ? process.argv[exportedAtIdx + 1] : undefined;

const raw = JSON.parse(readFileSync(inPath, "utf8"));
const records: Annotation[] = Array.isArray(raw) ? raw : raw?.annotations;
if (!Array.isArray(records)) {
  console.error("input has no annotation array (expected a bare array or an object with `annotations`)");
  process.exit(1);
}

const personId = records.find((a) => typeof a?.personId === "string")?.personId ?? null;
const source: EnvelopeSource = {
  origin: "https://www.churchofjesuschrist.org",
  api: "study/api/v3/annotationsWithMeta",
  locale: records.find((a) => typeof a?.locale === "string")?.locale ?? "eng",
  personId,
  exporter,
};

// When not told, date the export from the newest record we can see — more
// honest than "now" for a historical dump.
const newest = records
  .flatMap((a) => [a?.lastUpdated, a?.created])
  .filter((s): s is string => typeof s === "string" && s !== "")
  .sort()
  .at(-1);
const exportedAt = exportedAtArg ?? newest ?? new Date().toISOString();

const env = wrapAnnotations(records, source, exportedAt);
const check = validateEnvelope(env);
if (!check.ok) {
  console.error("refusing to write — wrapped envelope failed validation:");
  for (const e of check.errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
for (const w of check.warnings) console.warn(`  ⚠ ${w}`);

writeFileSync(outPath, JSON.stringify(env, null, 1) + "\n");
console.log(`wrote ${outPath}  —  ${env.counts.total} records, exportedAt ${env.exportedAt}`);
