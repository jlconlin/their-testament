// Shared fetch policy for the Gospel Library content API, used by both the
// Node client (contentApi.ts) and the browser one (browserContent.ts).
//
// Two jobs, both about being a good guest on someone else's service:
//
//   RateGate spaces out when requests *start*, independently of how many are
//   in flight, so raising concurrency raises throughput without turning into
//   a burst.
//
//   fetchContentJson retries the failures that are worth retrying. This
//   matters more than it looks: a non-OK response used to be recorded as a
//   permanent failure and the document simply dropped out of the book, so a
//   transient 503 during a ten-minute run meant a keepsake quietly missing
//   verses, with only a line in the completeness report to show for it.
/** Statuses worth trying again. 404 is not one -- that document really is gone. */
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Honour Retry-After, whether it is given in seconds or as an HTTP date. */
function retryAfterMs(res) {
    const raw = res.headers?.get?.("Retry-After");
    if (!raw)
        return null;
    const secs = Number(raw);
    if (Number.isFinite(secs))
        return Math.max(0, secs * 1000);
    const when = Date.parse(raw);
    return Number.isFinite(when) ? Math.max(0, when - Date.now()) : null;
}
/**
 * GET a JSON document, retrying transient failures with exponential backoff.
 * Throws on a non-retryable status or once the attempts are spent -- callers
 * still decide whether that is fatal.
 */
export async function fetchContentJson(url, opts = {}) {
    const retries = opts.retries ?? 3;
    const base = opts.baseDelayMs ?? 600;
    let lastErr;
    let retryAfter = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            // Full jitter unless the server named a time: parallel workers that hit
            // the same 429 must not all wake up together and hit it again.
            const capped = Math.min(base * 2 ** (attempt - 1), 8000);
            const delayMs = retryAfter ?? Math.random() * capped;
            opts.onRetry?.({ attempt, delayMs, reason: lastErr?.message ?? "unknown" });
            await sleep(delayMs);
            retryAfter = null;
        }
        let res;
        try {
            res = await fetch(url, { headers: { Accept: "application/json" } });
        }
        catch (e) {
            lastErr = e instanceof Error ? e : new Error(String(e)); // offline, DNS, reset
            continue;
        }
        if (res.ok)
            return (await res.json());
        if (!RETRYABLE.has(res.status))
            throw new Error(`content ${res.status}`);
        retryAfter = retryAfterMs(res);
        lastErr = new Error(`content ${res.status}`);
    }
    throw lastErr ?? new Error("content fetch failed");
}
/**
 * Spaces the *start* of each request by `minIntervalMs`, no matter how many
 * callers are waiting. A plain `last = Date.now()` check can't do this: under
 * concurrency every caller reads the same stale timestamp and they all go at
 * once. Acquisition is chained through a promise so the spacing holds.
 */
export class RateGate {
    minIntervalMs;
    constructor(minIntervalMs) {
        this.minIntervalMs = minIntervalMs;
    }
    tail = Promise.resolve();
    last = 0;
    async wait() {
        const prev = this.tail;
        let release;
        this.tail = new Promise((r) => { release = r; });
        await prev;
        const gap = this.minIntervalMs - (Date.now() - this.last);
        if (gap > 0)
            await sleep(gap);
        this.last = Date.now();
        release();
    }
}
/** Run `worker` over `items` with at most `concurrency` in flight. */
export async function pool(items, concurrency, worker) {
    let next = 0;
    const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
        while (true) {
            const i = next++;
            if (i >= items.length)
                return;
            await worker(items[i], i);
        }
    });
    await Promise.all(runners);
}
