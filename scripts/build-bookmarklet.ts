// Generate the bookmarklet loader and inject it into web/index.html.
//
//   npx tsx scripts/build-bookmarklet.ts [--host https://theirtestament.org]
//
// The bookmarklet is a tiny, stable stub: it injects a <script> tag pointing
// at <host>/e.js (the real exporter, which we can update without anyone
// re-installing). The Church study pages set no script-src / default-src CSP,
// so the injected script loads and runs.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const hostArg = process.argv.indexOf("--host");
const HOST = (hostArg > -1 ? process.argv[hostArg + 1] : process.env.TT_HOST) || "https://theirtestament.org";
const base = HOST.replace(/\/+$/, "");

// The loader. Kept to one line, no external deps, tolerant of a missing <body>.
const loader =
  `(function(){` +
  `var d=document,s=d.createElement('script');` +
  `s.src='${base}/e.js?v='+Date.now();` +
  `s.onerror=function(){alert('Their Testament: the exporter could not load. Check your connection and try again.')};` +
  `(d.body||d.documentElement).appendChild(s)` +
  `})();`;

// href-safe: encode spaces and the few characters that break inside an
// attribute or a pasted bookmark URL. Quotes in the loader are single, so
// double-quoted href attributes are fine.
const href = "javascript:" + loader.replace(/ /g, "%20").replace(/"/g, "%22");

const idxPath = resolve(ROOT, "web/index.html");
const html = readFileSync(idxPath, "utf8");
const next = html.replace(/href="javascript:[^"]*"|href="__BOOKMARKLET__"/, `href="${href}"`);
if (next === html && !html.includes(href)) {
  console.error("could not find the bookmarklet href placeholder in web/index.html");
  process.exit(1);
}
writeFileSync(idxPath, next);
writeFileSync(resolve(ROOT, "web/bookmarklet.txt"), href + "\n");

console.log(`host      ${base}`);
console.log(`loader    ${loader.length} chars`);
console.log(`injected  web/index.html`);
console.log(`written   web/bookmarklet.txt`);
