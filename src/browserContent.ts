import type { ContentPage, ContentSource } from "./types.ts";
import { RateGate, fetchContentJson, pool } from "./contentFetch.ts";

const BASE = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";
const DB_NAME = "their-testament-content";
const STORE = "pages";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<ContentPage | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: ContentPage): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Browser counterpart to `contentApi.ts`'s `ContentClient` — same contract,
 * IndexedDB instead of a disk cache. Fetch is unchanged (the endpoint's CORS
 * is open; confirmed in decisions.md).
 */
export interface ContentProgress {
  fetched: number;
  cacheHits: number;
  failed: number;
  /** Total this run expects to fetch, once a prefetch plan is known. */
  total?: number;
  /** Set while backing off, so the UI can explain the pause instead of stalling. */
  waitingMs?: number;
}

/**
 * How many documents are in flight during the prefetch pass, and how far apart
 * their requests start.
 *
 * Deliberately modest. This runs from the visitor's own IP against someone
 * else's service, so getting *them* rate-limited or blocked is a worse outcome
 * than being slow. 5 in flight at 120ms spacing is ~8 requests/second: several
 * times faster than the old 400ms serial gate (2.5/s) while still visibly a
 * polite client rather than a scraper.
 */
const PREFETCH_CONCURRENCY = 5;
const PREFETCH_INTERVAL_MS = 120;

export class ContentClientBrowser implements ContentSource {
  constructor(
    private lang = "eng",
    minIntervalMs = PREFETCH_INTERVAL_MS,
    private onProgress?: (p: ContentProgress) => void,
  ) {
    this.gate = new RateGate(minIntervalMs);
  }

  private gate: RateGate;
  private dbPromise = openDb();
  private total?: number;
  private waitingMs = 0;

  private key(docUri: string): string {
    return `${docUri}::${this.lang}`;
  }

  readonly failures = new Map<string, string>();
  fetched = 0;
  cacheHits = 0;

  private reportProgress(): void {
    this.onProgress?.({
      fetched: this.fetched,
      cacheHits: this.cacheHits,
      failed: this.failures.size,
      total: this.total,
      waitingMs: this.waitingMs || undefined,
    });
  }

  async get(docUri: string): Promise<ContentPage> {
    const db = await this.dbPromise;
    const key = this.key(docUri);
    const cached = await idbGet(db, key);
    if (cached) {
      this.cacheHits++;
      this.reportProgress();
      return cached;
    }

    await this.gate.wait();

    const url = `${BASE}?lang=${this.lang}&uri=${encodeURIComponent(docUri)}`;
    let data: ContentPage;
    try {
      data = await fetchContentJson<ContentPage>(url, {
        onRetry: ({ delayMs }) => {
          // surface the pause rather than letting the bar look frozen
          this.waitingMs = Math.round(delayMs);
          this.reportProgress();
        },
      });
    } catch (e) {
      throw new Error(`${(e as Error).message} for ${docUri}`);
    } finally {
      this.waitingMs = 0;
    }

    await idbPut(db, key, data);
    this.fetched++;
    this.reportProgress();
    return data;
  }

  /**
   * Warm the cache for every document a run will need, several at a time.
   *
   * Assembly stays exactly as it was -- serial, one document at a time -- but
   * finds everything already in IndexedDB, so the ~1,560 network round-trips
   * that dominated a first run collapse into one concurrent pass. Failures are
   * not thrown here: a document that cannot be fetched is left out, and
   * assembly will ask for it again and record its own diagnostic, which is
   * what feeds the completeness report.
   */
  async prefetch(uris: string[], concurrency = PREFETCH_CONCURRENCY): Promise<void> {
    const db = await this.dbPromise;
    const missing: string[] = [];
    for (const uri of uris) {
      // Don't count these as cache hits: assembly is about to ask for every
      // one of them again, and that pass is what the hit counter reports.
      if (!(await idbGet(db, this.key(uri)))) missing.push(uri);
    }
    this.total = missing.length;
    this.reportProgress();
    await pool(missing, concurrency, async (uri) => { await this.tryGet(uri); });
    this.total = undefined;
  }

  async tryGet(docUri: string): Promise<ContentPage | null> {
    try {
      return await this.get(docUri);
    } catch (e) {
      this.failures.set(docUri, e instanceof Error ? e.message : String(e));
      this.reportProgress();
      return null;
    }
  }
}
