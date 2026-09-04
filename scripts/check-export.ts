// Validate an annotations.json export against the envelope spec.
//
//   npx tsx scripts/check-export.ts <file>
//
// Exit 0 = usable (possibly with warnings); exit 1 = rejected.
// Spec: docs/annotations-format.md

import { readFileSync } from "node:fs";
import { validateEnvelope } from "../src/envelope.ts";

const path = process.argv[2];
if (!path) {
  console.error("usage: npx tsx scripts/check-export.ts <file>");
  process.exit(2);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`could not read/parse ${path}: ${(e as Error).message}`);
  process.exit(1);
}

const r = validateEnvelope(raw);

console.log(`file        ${path}`);
console.log(`envelope    ${r.wrappedLegacy ? "bare array (wrapped as v1)" : `version ${r.version ?? "?"}`}`);
if (r.envelope) {
  const { total, byType } = r.envelope.counts;
  console.log(`exportedAt  ${r.envelope.exportedAt}`);
  console.log(`source      ${JSON.stringify(r.envelope.source)}`);
  console.log(`records     ${total}  (${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", ")})`);
}
if (r.warnings.length) {
  console.log(`\nwarnings (${r.warnings.length}):`);
  for (const w of r.warnings) console.log(`  ⚠ ${w}`);
}
if (r.errors.length) {
  console.log(`\nerrors (${r.errors.length}):`);
  for (const e of r.errors) console.log(`  ✗ ${e}`);
}

console.log(`\n${r.ok ? "✓ usable" : "✗ rejected"}`);
process.exit(r.ok ? 0 : 1);
