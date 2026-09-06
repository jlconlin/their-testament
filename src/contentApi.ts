import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ContentPage, ContentSource } from "./types.ts";
import { RateGate, fetchContentJson, pool } from "./contentFetch.ts";

const BASE = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";

/**
 * Fetch a Gospel Library document's content, with a polite on-disk cache.
 *
 * `docUri` is the document path with no anchor, e.g. "/scriptures/ot/job/1"
 * or "/general-conference/2019/04/51gong".
 *
 * The web build will swap this cache dir for IndexedDB; the fetch itself is
 * identical (CORS on this endpoint is open).
 */
export class ContentClient implements ContentSource {
  constructor(
    private cacheDir: string,
    private lang = "eng",
    minIntervalMs = 400, // be gentle with an unofficial endpoint
  ) {
    this.gate = new RateGate(minIntervalMs);
  }

  private gate: RateGate;

  private cachePath(docUri: string): string {
    const slug = docUri.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
    return join(this.cacheDir, `${slug}.${this.lang}.json`);
  }

  /** docUri -> failure reason, for docs that could not be fetched */
  readonly failures = new Map<string, string>();
  fetched = 0;
  cacheHits = 0;

  async get(docUri: string): Promise<ContentPage> {
    const path = this.cachePath(docUri);
    if (existsSync(path)) {
      this.cacheHits++;
      return JSON.parse(await readFile(path, "utf8")) as ContentPage;
    }

    await this.gate.wait();

    const url = `${BASE}?lang=${this.lang}&uri=${encodeURIComponent(docUri)}`;
    let data: ContentPage;
    try {
      data = await fetchContentJson<ContentPage>(url);
    } catch (e) {
      throw new Error(`${(e as Error).message} for ${docUri}`);
    }

    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(path, JSON.stringify(data));
    this.fetched++;
    return data;
  }

  /** Warm the cache concurrently; see browserContent.ts's prefetch for why. */
  async prefetch(uris: string[], concurrency = 5): Promise<void> {
    const missing = uris.filter((u) => !existsSync(this.cachePath(u)));
    await pool(missing, concurrency, async (uri) => { await this.tryGet(uri); });
  }

  /** Like get(), but records the failure and returns null instead of throwing. */
  async tryGet(docUri: string): Promise<ContentPage | null> {
    try {
      return await this.get(docUri);
    } catch (e) {
      this.failures.set(docUri, e instanceof Error ? e.message : String(e));
      return null;
    }
  }
}
