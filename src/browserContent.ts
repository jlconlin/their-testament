import type { ContentPage, ContentSource } from "./types.ts";

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
}

export class ContentClientBrowser implements ContentSource {
  constructor(
    private lang = "eng",
    private minIntervalMs = 400,
    private onProgress?: (p: ContentProgress) => void,
  ) {}

  private dbPromise = openDb();
  private last = 0;

  private key(docUri: string): string {
    return `${docUri}::${this.lang}`;
  }

  readonly failures = new Map<string, string>();
  fetched = 0;
  cacheHits = 0;

  private reportProgress(): void {
    this.onProgress?.({ fetched: this.fetched, cacheHits: this.cacheHits, failed: this.failures.size });
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

    const wait = this.minIntervalMs - (Date.now() - this.last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.last = Date.now();

    const url = `${BASE}?lang=${this.lang}&uri=${encodeURIComponent(docUri)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`content ${res.status} for ${docUri}`);
    const data = (await res.json()) as ContentPage;

    await idbPut(db, key, data);
    this.fetched++;
    this.reportProgress();
    return data;
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
