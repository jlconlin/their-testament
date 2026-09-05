// Compiles one piece of a book, then gets thrown away.
//
// typst.ts reuses a single wasm instance per realm and wasm linear memory can
// only grow, so nothing inside a page can hand that memory back -- compiling
// several pieces in one realm costs the sum of their peaks and walks into the
// same 4 GiB ceiling that stops a whole-book compile. Terminating the Worker
// is what actually frees it, so browserRender.ts spawns one of these per piece
// and terminates it as soon as it answers. A piece that fails takes its
// wreckage with it.
// typst.ts's browser bundle reaches for `window`, which a Worker doesn't have.
// The shim has to be in place before that bundle is evaluated, so the import
// below is dynamic -- a static one would be hoisted above this line.
globalThis.window ??= globalThis;

// Kept as a promise rather than awaited at the top level: with a top-level
// await the message handler isn't registered until the import resolves, and
// the job the main thread posts in the meantime is dropped on the floor.
const modulePromise = import("./gen/browserRender.js");

self.onmessage = async (e) => {
  const { book, mainTypst, fonts, mode, pagemap, continued } = e.data;
  try {
    const { compileChunk } = await modulePromise;
    const pdf = await compileChunk({ book, mainTypst, fonts, mode, pagemap, continued });
    self.postMessage({ ok: true, pdf }, [pdf.buffer]);
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.stack) || err) });
  }
};
