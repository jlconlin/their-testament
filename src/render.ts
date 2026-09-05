import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DocBook } from "./types.ts";

// Personal ~/Library/Fonts first (lets a local build override with anything
// installed), then the project's own bundled OFL fonts -- so a fresh clone
// renders correctly with no font install step.
const PERSONAL_FONT_PATH = `${process.env.HOME}/Library/Fonts`;

/**
 * Write the doc-model JSON and compile the Typst template to PDF.
 * `outPdf` and the JSON are written under the project; `projectRoot` is passed
 * to typst as --root so the template can read the JSON by a root-relative path.
 */
export function renderPdf(opts: {
  book: DocBook;
  projectRoot: string;
  template: string;   // path to book.typ, relative to projectRoot
  outPdf: string;     // path relative to projectRoot, e.g. "out/job/job.pdf"
}): { pdf: string; json: string } {
  const root = resolve(opts.projectRoot);
  const jsonRel = opts.outPdf.replace(/\.pdf$/, ".doc.json");
  const jsonAbs = resolve(root, jsonRel);
  const pdfAbs = resolve(root, opts.outPdf);
  mkdirSync(dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, JSON.stringify(opts.book));

  const res = spawnSync(
    "typst",
    [
      "compile",
      "--root", root,
      "--font-path", PERSONAL_FONT_PATH,
      "--font-path", resolve(root, "web/fonts"),
      "--input", `doc=/${jsonRel}`,
      resolve(root, opts.template),
      pdfAbs,
    ],
    { stdio: "inherit" },
  );
  if (res.status !== 0) throw new Error(`typst exited ${res.status}`);
  return { pdf: pdfAbs, json: jsonAbs };
}
