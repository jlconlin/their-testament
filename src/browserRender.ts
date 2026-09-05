import type { DocBook } from "./types.ts";
import { mergePdfs, readAnchors, pageCount } from "./mergePdf.ts";

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

async function newCompiler(fonts: (string | Uint8Array)[] | undefined): Promise<any> {
  const { createTypstCompiler, loadFonts } = await loadCompilerModule();
  const compiler = createTypstCompiler();
  await compiler.init({
    getModule: () => new URL(TYPST_WASM_URL),
    beforeBuild: fonts?.length ? [loadFonts(fonts)] : [],
  });
  return compiler;
}

export type ChunkMode = "full" | "front" | "part" | "back";

export interface ChunkSpec {
  book: DocBook;
  mode: ChunkMode;
  /** key -> absolute page in the finished book, for pieces that reference others. */
  pagemap?: Record<string, number>;
  /** A continuation of a Part that had to be divided: no title page, no contents. */
  continued?: boolean;
}

async function compileOne(compiler: any, mainTypst: string, spec: ChunkSpec): Promise<Uint8Array> {
  compiler.mapShadow("/doc.json", new TextEncoder().encode(JSON.stringify(spec.book)));
  const inputs: Record<string, string> = { doc: "/doc.json", mode: spec.mode };
  if (spec.pagemap) {
    compiler.mapShadow("/pagemap.json", new TextEncoder().encode(JSON.stringify(spec.pagemap)));
    inputs.pagemap = "/pagemap.json";
  }
  if (spec.continued) inputs.continued = "yes";
  compiler.addSource("/main.typ", mainTypst);
  const { result, diagnostics } = await compiler.compile({
    mainFilePath: "/main.typ",
    inputs,
    format: PDF_FORMAT,
  });
  if (!result) throw new Error(`typst compile failed (${spec.mode}): ${JSON.stringify(diagnostics)}`);
  return result as Uint8Array;
}

/** Entry point used by web/compile-worker.js -- one chunk, one fresh realm. */
export async function compileChunk(opts: ChunkSpec & {
  mainTypst: string;
  fonts?: (string | Uint8Array)[];
}): Promise<Uint8Array> {
  const compiler = await newCompiler(opts.fonts);
  return compileOne(compiler, opts.mainTypst, opts);
}

/**
 * Compile a DocBook + a Typst template into PDF bytes, entirely client-side,
 * in one pass. `mainTypst` is book.typ's *source text* (there's no
 * filesystem in the browser, so the caller fetches it, e.g. from
 * web/gen/book.typ). Fonts are self-hosted files (URLs or raw bytes) --
 * see web/fonts/README.md.
 *
 * A real corpus (~17,000 marked verses/paragraphs) can't be laid out in one
 * pass under wasm32: measured against the real book, the compiler peaks at
 * 4.20 GB and dies when memory.grow hits the 4 GiB address-space ceiling
 * (Rust's allocation-error handler aborts, which surfaces as the wasm
 * `unreachable` trap). Relieving the memory pressure only exposes a second,
 * independent wall -- a genuine layout-recursion stack overflow. The same
 * document compiles fine via the native 64-bit CLI. Use `renderBookAuto`,
 * which falls back to compiling the book in pieces.
 */
export async function renderPdfBrowser(opts: {
  book: DocBook;
  mainTypst: string;
  fonts?: (string | Uint8Array)[];
}): Promise<Uint8Array> {
  return compileChunk({ ...opts, mode: "full" });
}


// ---- compiling a book in pieces -------------------------------------------

/**
 * Run one chunk in a throwaway Worker; resolves null if it fails.
 *
 * Every chunk gets its own Worker, and the Worker is terminated as soon as it
 * answers. That isn't just crash containment: typst.ts reuses a single wasm
 * instance per realm (calling createTypstCompiler() again does NOT give you a
 * fresh heap), and wasm linear memory only ever grows. Compiling the pieces
 * one after another on the main thread therefore costs the *sum* of their
 * peaks -- measured at 3.72 GB on the real book, within 0.5 GB of the same
 * ceiling that kills the single pass, which is why that path was flaky.
 * Terminating the realm is the only way to actually give the memory back, so
 * peak becomes the cost of the largest single chunk instead.
 */
function runChunk(
  spec: ChunkSpec,
  mainTypst: string,
  fonts: (string | Uint8Array)[] | undefined,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../compile-worker.js", import.meta.url), { type: "module" });
    } catch {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (value: Uint8Array | null) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(value);
    };
    worker.onmessage = (e: MessageEvent) => done(e.data?.ok ? (e.data.pdf as Uint8Array) : null);
    worker.onerror = () => done(null);
    worker.postMessage({ ...spec, mainTypst, fonts });
  });
}

/**
 * Halve a Part's contents. Only used when a Part is by itself too big to
 * compile -- Parts are wildly uneven (one book here holds 649 conference
 * talks against another's 5 chapters), so "one chunk per Part" alone isn't a
 * guarantee that any chunk actually fits.
 */
function splitPart(part: any): [any, any] | null {
  const halve = <T,>(xs: T[]): [T[], T[]] => {
    const at = Math.ceil(xs.length / 2);
    return [xs.slice(0, at), xs.slice(at)];
  };
  if (part.kind === "scripture" && part.chapters?.length > 1) {
    const [a, b] = halve(part.chapters);
    return [{ ...part, chapters: a }, { ...part, chapters: b }];
  }
  if (part.kind === "notebooks" && part.notebooks?.length > 1) {
    const [a, b] = halve(part.notebooks);
    return [{ ...part, notebooks: a }, { ...part, notebooks: b }];
  }
  if (part.kind === "gc" && part.conferences?.length > 1) {
    const [a, b] = halve(part.conferences);
    return [{ ...part, conferences: a }, { ...part, conferences: b }];
  }
  // A single conference that's still too big: divide its talks.
  if (part.kind === "gc" && part.conferences?.length === 1 && part.conferences[0].talks?.length > 1) {
    const conf = part.conferences[0];
    const [a, b] = halve(conf.talks);
    return [
      { ...part, conferences: [{ ...conf, talks: a }] },
      { ...part, conferences: [{ ...conf, talks: b }] },
    ];
  }
  return null;
}

interface SplitCtx {
  book: DocBook;
  mainTypst: string;
  fonts?: (string | Uint8Array)[];
  onProgress?: (label: string) => void;
}

/** Compile one Part, dividing it and retrying if it won't fit on its own. */
async function compilePart(ctx: SplitCtx, part: any, out: Uint8Array[], continued = false): Promise<void> {
  const book = { ...ctx.book, parts: [part], tagIndex: [], unplacedNotes: [] } as DocBook;
  const pdf = await runChunk({ book, mode: "part", continued }, ctx.mainTypst, ctx.fonts);
  if (pdf) {
    out.push(pdf);
    return;
  }
  const halves = splitPart(part);
  if (!halves) {
    throw new Error(`"${part.title}" is too large for this browser to lay out, and can't be divided any further.`);
  }
  ctx.onProgress?.(`${part.title} (dividing further)`);
  await compilePart(ctx, halves[0], out, continued);
  await compilePart(ctx, halves[1], out, true);
}

/**
 * Render a book the best way it fits: one pass when it can (everything stays
 * natively clickable), otherwise piece by piece, stitched back into a single
 * file with bookmarks and cross-references intact.
 *
 * There's no size threshold to guess at -- whether a document fits isn't
 * reliably predicted by verse count, so trying is more honest than
 * estimating, and a failed attempt costs nothing but its Worker.
 */
export async function renderBookAuto(opts: SplitCtx): Promise<{ pdf: Uint8Array; split: boolean }> {
  opts.onProgress?.("the whole book, in one pass");
  const onePass = await runChunk({ book: opts.book, mode: "full" }, opts.mainTypst, opts.fonts);
  if (onePass) return { pdf: onePass, split: false };

  opts.onProgress?.("too large for one pass — compiling it in pieces instead");

  const need = async (spec: ChunkSpec, what: string): Promise<Uint8Array> => {
    const pdf = await runChunk(spec, opts.mainTypst, opts.fonts);
    if (!pdf) throw new Error(`The ${what} was too large for this browser to lay out.`);
    return pdf;
  };

  // Front matter first, only to learn how many pages it occupies -- every
  // other piece's absolute page numbers are measured from the end of it.
  opts.onProgress?.("front matter");
  const frontPlain = await need({ book: opts.book, mode: "front" }, "front matter");
  const frontPages = await pageCount(frontPlain);

  const partPdfs: Uint8Array[] = [];
  for (const part of opts.book.parts) {
    opts.onProgress?.(part.title);
    await compilePart(opts, part, partPdfs);
  }

  // Each piece reported where its own anchors landed; shift those into the
  // page space of the finished book so references can name a real page.
  const pagemap: Record<string, number> = {};
  let offset = frontPages;
  for (const pdf of partPdfs) {
    for (const [key, local] of await readAnchors(pdf)) {
      if (!(key in pagemap)) pagemap[key] = offset + local + 1;
    }
    offset += await pageCount(pdf);
  }

  // Back matter can now print true book page numbers in the tag index.
  opts.onProgress?.("tag index and closing notes");
  const back = await need({ book: { ...opts.book, parts: [] }, mode: "back", pagemap }, "tag index");
  for (const [key, local] of await readAnchors(back)) {
    if (!(key in pagemap)) pagemap[key] = offset + local + 1;
  }

  // Re-do the front matter now that every destination is known, so its list of
  // Parts links too. Adding links doesn't reflow anything, but if the page
  // count moved for any reason, keep the version whose length the offsets were
  // computed from -- correct page numbers matter more than clickable ones.
  let front = frontPlain;
  const frontLinked = await runChunk({ book: opts.book, mode: "front", pagemap }, opts.mainTypst, opts.fonts);
  if (frontLinked && (await pageCount(frontLinked)) === frontPages) front = frontLinked;

  opts.onProgress?.("stitching the pieces together");
  const pdf = await mergePdfs([front, ...partPdfs, back]);
  return { pdf, split: true };
}
