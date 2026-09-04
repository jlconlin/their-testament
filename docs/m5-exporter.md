# M5 — the annotation exporter

The acquisition half of the project: how a normal person gets their Gospel
Library annotations out as a `their-testament` `annotations.json`
([spec](annotations-format.md)) without dev tools.

## Pieces

| file | what |
|---|---|
| `web/index.html` | the landing page — hero, sample spreads, how-it-works, privacy, FAQ; the "drag me" bookmarklet lives here |
| `web/e.js` | the exporter — paginates the Notes API, wraps, downloads |
| `web/fonts/` | self-hosted Fraunces + EB Garamond (OFL); no third-party font requests |
| `web/favicon.svg`, `web/og.png` | icon + social-share card |
| `web/404.html`, `web/CNAME`, `web/.nojekyll`, `web/robots.txt`, `web/sitemap.xml` | GitHub Pages support files |
| `web/bookmarklet.txt` | the generated `javascript:` loader (copy for reference) |
| `scripts/build-bookmarklet.ts` | generates the loader, injects it into `index.html` |
| `.github/workflows/pages.yml` | deploys `web/` to GitHub Pages on push |

## How it works

1. The visitor drags **Export my annotations** to their bookmarks bar. That
   bookmark is a ~270-char loader:

   ```js
   javascript:(function(){var d=document,s=d.createElement('script');
   s.src='https://theirtestament.org/e.js?v='+Date.now();
   s.onerror=…;(d.body||d.documentElement).appendChild(s)})();
   ```

2. They sign in at churchofjesuschrist.org, open any **Study** page, and click
   the bookmark. The loader injects `e.js` from our site. This works because
   the Church study pages send a CSP with only `frame-src` and `style-src` —
   **no `script-src` / `default-src`** — so an injected external script runs,
   and same-origin `fetch` to the Notes API is unrestricted.

3. `e.js` pages through:

   ```
   GET /notes/api/v3/annotationsWithMeta?setId=all&type=highlight,reference,journal&numberToReturn=1000&start=<n>
       credentials: include        (uses the visitor's existing session cookie)
   ```

   until a page returns fewer than 1000 records. Records are de-duplicated by
   `annotationId`. A small shadow-DOM panel (bottom-right) shows progress.

4. It wraps the raw records in a v1 envelope (`exportedAt` = now, `source`
   from `location.origin` + the first record's `personId`/`locale`,
   `exporter: "their-testament-bookmarklet/0.1"`) and triggers a download of
   `their-testament-annotations-<date>.json`. A manual download link is always
   shown too, in case the automatic click is blocked.

Nothing is transmitted anywhere. `e.js` is served as a static file; there is
no backend.

## Building

```bash
npx tsx scripts/build-bookmarklet.ts                       # host = https://theirtestament.org
npx tsx scripts/build-bookmarklet.ts --host https://xyz.pages.dev   # for a staging deploy
```

Re-run whenever the host changes. The loader carries `?v=Date.now()` so a
redeployed `e.js` is picked up immediately — no re-install.

## Testing

**Offline** — `e.js` was verified with a temporary harness that feeds it
fabricated annotations (mixed response-wrapper shapes, multiple pages) and
checks pagination, de-duplication, and the resulting envelope. 4,321 fake
records across 5 pages round-tripped clean. The harness is not kept in the repo
(re-create under `web/_*`, which is git-ignored, if the fetch/paginate logic
changes).

**Live** (needs a real churchofjesuschrist.org login) — the real proof, and
the second-account test the roadmap calls for:

1. Deploy `web/` somewhere (or run the local server and load `e.js` by hand).
2. Install the bookmarklet, sign in, open a Study page, click it.
3. Confirm the count matches what you expect and the file validates:
   ```bash
   npx tsx scripts/check-export.ts ~/Downloads/their-testament-annotations-*.json
   ```
4. Generate a book from it:
   ```bash
   cp ~/Downloads/their-testament-annotations-*.json data/raw/<date>/export.json
   npx tsx scripts/validate.ts --render
   ```

## Known unknowns (verify on the first live run)

- **`start` indexing.** Assumed 1-indexed. `e.js` retries once from `0` if the
  first page is empty, and de-dupes, so an off-by-one won't lose or duplicate
  records — but confirm the total is right.
- **Response wrapper.** Assumed a bare array or `{ annotations: [...] }`.
  `e.js` also accepts `items` / `data` / `results`. If it's something else the
  export will look empty — check the Network tab.
- **iPad Safari** bookmarklet install is fiddly (bookmark a page, then edit the
  bookmark's URL). Works, but desktop is the smooth path. Document for testers.
- **Rate limiting.** 300 ms between pages, ~20 pages for a large account. If the
  API pushes back (429), we'll need backoff.

## Deploying `web/` to GitHub Pages

The site is `web/`, deployed by `.github/workflows/pages.yml` (publishes the
`web/` folder as the Pages artifact — the rest of the repo is not served).

One-time setup:

1. Push the repo to GitHub (`jlconlin/their-testament`, public).
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow runs on push; the first run publishes the site.
4. **Custom domain** (`theirtestament.org`):
   - `web/CNAME` already contains it.
   - At the DNS host, add for the apex: four `A` records to `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and/or `AAAA` to
     the `2606:50c0:8000::153` … `8003::153` set). For `www`, a `CNAME` to
     `jlconlin.github.io`.
   - Settings → Pages → Custom domain → enter `theirtestament.org`, then tick
     **Enforce HTTPS** once the cert issues.
5. The bookmarklet host is already `https://theirtestament.org`. If testing on
   the `*.github.io` URL first, run
   `npx tsx scripts/build-bookmarklet.ts --host https://jlconlin.github.io/their-testament`
   and commit, then switch back before launch.

`web/.nojekyll` disables Jekyll so the `fonts/` dir and dotfiles serve as-is.
