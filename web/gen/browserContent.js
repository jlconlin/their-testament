const BASE = "https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content";
const DB_NAME = "their-testament-content";
const STORE = "pages";
function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function idbGet(db, key) {
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function idbPut(db, key, value) {
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
export class ContentClientBrowser {
    lang;
    minIntervalMs;
    onProgress;
    constructor(lang = "eng", minIntervalMs = 400, onProgress) {
        this.lang = lang;
        this.minIntervalMs = minIntervalMs;
        this.onProgress = onProgress;
    }
    dbPromise = openDb();
    last = 0;
    key(docUri) {
        return `${docUri}::${this.lang}`;
    }
    failures = new Map();
    fetched = 0;
    cacheHits = 0;
    reportProgress() {
        this.onProgress?.({ fetched: this.fetched, cacheHits: this.cacheHits, failed: this.failures.size });
    }
    async get(docUri) {
        const db = await this.dbPromise;
        const key = this.key(docUri);
        const cached = await idbGet(db, key);
        if (cached) {
            this.cacheHits++;
            this.reportProgress();
            return cached;
        }
        const wait = this.minIntervalMs - (Date.now() - this.last);
        if (wait > 0)
            await new Promise((r) => setTimeout(r, wait));
        this.last = Date.now();
        const url = `${BASE}?lang=${this.lang}&uri=${encodeURIComponent(docUri)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok)
            throw new Error(`content ${res.status} for ${docUri}`);
        const data = (await res.json());
        await idbPut(db, key, data);
        this.fetched++;
        this.reportProgress();
        return data;
    }
    async tryGet(docUri) {
        try {
            return await this.get(docUri);
        }
        catch (e) {
            this.failures.set(docUri, e instanceof Error ? e.message : String(e));
            this.reportProgress();
            return null;
        }
    }
}
