import type { DocBook } from "./types.ts";

// Pinned versions, loaded straight from jsdelivr (no bundler; matches the
// rest of web/, which is deploy-as-is static files). "all-in-one-lite" is
// typst.ts's own pre-bundled browser build -- the plain package export
// resolves internal `import('@myriaddreamin/typst-ts-web-compiler')` bare
// specifiers, which only a rewriting CDN (not jsdelivr) can follow, and even
// esm.sh's rewrite trips on that package's Node.js fallback branch. Verified
// working end-to-end against typst.ts 0.7.0 (see git history for the
// throwaway web/_typst-wasm-test.html this was checked with).
const TYPST_JS_URL =
  "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst.ts@0.7.0/dist/esm/contrib/all-in-one-lite.bundle.js";
const TYPST_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm";

// CompileFormatEnum.pdf -- not exported by the lite bundle, but
// vector=0/pdf=1/_dummy=2 is a stable, checked-in part of the enum's
// definition. Passing the string "pdf" silently compiles to the vector
// format instead (no error, wrong bytes) -- confirmed by hand.
const PDF_FORMAT = 1;

let compilerModulePromise: Promise<any> | undefined;
function loadCompilerModule(): Promise<any> {
  return (compilerModulePromise ??= import(/* webpackIgnore: true */ TYPST_JS_URL));
}

/**
 * Compile a DocBook + a Typst template into PDF bytes, entirely client-side.
 *
 * `mainTypst` is book.typ's *source text* (there's no filesystem in the
 * browser, so the caller fetches it, e.g. from web/gen/book.typ). Fonts are
 * whatever typst.ts's default assets provide until the font-licensing
 * decision in decisions.md (M6) is made -- pass `fonts` (URLs or raw bytes)
 * once real OFL files are chosen.
 */
export async function renderPdfBrowser(opts: {
  book: DocBook;
  mainTypst: string;
  fonts?: (string | Uint8Array)[];
}): Promise<Uint8Array> {
  const { createTypstCompiler, loadFonts } = await loadCompilerModule();
  const compiler = createTypstCompiler();
  await compiler.init({
    getModule: () => new URL(TYPST_WASM_URL),
    beforeBuild: opts.fonts?.length ? [loadFonts(opts.fonts)] : [],
  });

  compiler.mapShadow("/doc.json", new TextEncoder().encode(JSON.stringify(opts.book)));
  compiler.addSource("/main.typ", opts.mainTypst);

  const { result, diagnostics } = await compiler.compile({
    mainFilePath: "/main.typ",
    inputs: { doc: "/doc.json" },
    format: PDF_FORMAT,
  });

  if (!result) throw new Error(`typst compile failed: ${JSON.stringify(diagnostics)}`);
  return result as Uint8Array;
}
