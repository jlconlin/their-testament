/*
 * Their Testament — annotation exporter
 * ------------------------------------------------------------------
 * Loaded by the bookmarklet stub while the user is signed in on
 * churchofjesuschrist.org. Pages through the Gospel Library Notes API
 * using the user's own session, wraps the raw records in a
 * `their-testament` envelope (see docs/annotations-format.md), and
 * saves the file to the user's downloads. Nothing is sent anywhere.
 *
 * Runs entirely in the visitor's browser. This script has no backend.
 */
(function () {
  "use strict";

  var FORMAT = "their-testament";
  var VERSION = 1;
  var EXPORTER = "their-testament-bookmarklet/0.1";
  var API = "/notes/api/v3/annotationsWithMeta";
  var PAGE = 1000;          // records per request
  var TYPES = "highlight,reference,journal";
  var PAUSE_MS = 300;       // be polite to the API between pages
  var MAX_PAGES = 200;      // safety stop (~200k annotations)

  // --- guard rails ---------------------------------------------------
  if (window.__ttExportRunning) return;
  window.__ttExportRunning = true;

  // --- tiny UI (isolated in a shadow root) --------------------------
  function makeUi() {
    var hostEl = document.createElement("div");
    hostEl.id = "tt-exporter";
    // `all:initial` first, THEN positioning — otherwise it resets position back to static
    hostEl.style.cssText = "all:initial";
    hostEl.style.position = "fixed";
    hostEl.style.right = "16px";
    hostEl.style.bottom = "16px";
    hostEl.style.zIndex = "2147483647";
    var root = hostEl.attachShadow ? hostEl.attachShadow({ mode: "open" }) : hostEl;
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '.card{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'width:320px;background:#fff;color:#1a1a1a;border:1px solid #d8d2c4;' +
      'border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:16px 18px}' +
      '@media (prefers-color-scheme:dark){.card{background:#232323;color:#eee;border-color:#3a3a3a}}' +
      '.t{font-weight:600;margin:0 0 6px;font-size:14px}' +
      '.m{margin:0;opacity:.85}' +
      '.bar{height:6px;border-radius:3px;background:#e7e2d6;margin:12px 0 4px;overflow:hidden}' +
      '@media (prefers-color-scheme:dark){.bar{background:#3a3a3a}}' +
      '.fill{height:100%;width:0;background:#7a5c3e;transition:width .3s}' +
      '.err .fill{background:#b23b3b}' +
      '.row{display:flex;gap:8px;margin-top:12px}' +
      'button{font:inherit;padding:6px 12px;border-radius:7px;border:1px solid #cfc7b5;' +
      'background:#f4efe3;color:inherit;cursor:pointer}' +
      'button.primary{background:#7a5c3e;color:#fff;border-color:#7a5c3e}' +
      'a.dl{color:#7a5c3e;font-weight:600;text-decoration:underline}' +
      '</style>' +
      '<div class="card"><p class="t"></p><p class="m"></p>' +
      '<div class="bar"><div class="fill"></div></div>' +
      '<div class="row"></div></div>';
    (document.body || document.documentElement).appendChild(hostEl);
    var card = root.querySelector(".card");
    return {
      set: function (title, msg, pct) {
        root.querySelector(".t").textContent = title;
        root.querySelector(".m").textContent = msg;
        if (pct != null) root.querySelector(".fill").style.width = Math.max(2, pct) + "%";
      },
      fail: function (title, msg) {
        card.classList.add("err");
        this.set(title, msg, 100);
        this.button("Close", function () { hostEl.remove(); }, false, true);
      },
      button: function (label, fn, primary, replace) {
        var row = root.querySelector(".row");
        if (replace) row.innerHTML = "";
        var b = document.createElement("button");
        if (primary) b.className = "primary";
        b.textContent = label;
        b.onclick = fn;
        row.appendChild(b);
        return b;
      },
      link: function (label, href, download) {
        var row = root.querySelector(".row");
        row.innerHTML = "";
        var a = document.createElement("a");
        a.className = "dl";
        a.textContent = label;
        a.href = href;
        a.download = download;
        row.appendChild(a);
        return a;
      },
      close: function () { hostEl.remove(); },
    };
  }
  var ui = makeUi();

  // --- fetch one page ---------------------------------------------------
  function fetchPage(start) {
    // literal commas in `type` — the API expects them unencoded
    var url =
      API + "?setId=all&type=" + TYPES +
      "&numberToReturn=" + PAGE + "&start=" + start;
    return fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        throw new Error(
          "AUTH:Not signed in. Sign in to churchofjesuschrist.org, then click the bookmarklet again."
        );
      }
      if (!r.ok) throw new Error("HTTP " + r.status + " from the Notes API.");
      return r.json();
    }).then(function (j) {
      // the API wrapper shape has changed before; accept the common ones
      if (Array.isArray(j)) return j;
      return j.annotations || j.items || j.data || j.results || [];
    });
  }

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // --- page through everything ----------------------------------------
  function collect() {
    var all = [];
    var seen = Object.create(null);
    var start = 1;
    var triedZero = false;

    function next(pageNum) {
      if (pageNum > MAX_PAGES) return Promise.resolve(all);
      ui.set(
        "Exporting your annotations…",
        "Fetched " + all.length + " so far (page " + pageNum + ").",
        Math.min(95, 8 + pageNum * 4)
      );
      return fetchPage(start).then(function (batch) {
        // tolerate a 0-indexed `start`: if the first request is empty, retry once from 0
        if (pageNum === 1 && batch.length === 0 && !triedZero) {
          triedZero = true;
          start = 0;
          return next(1);
        }
        var added = 0;
        for (var i = 0; i < batch.length; i++) {
          var id = batch[i] && batch[i].annotationId;
          if (id && seen[id]) continue;
          if (id) seen[id] = 1;
          all.push(batch[i]);
          added++;
        }
        if (batch.length < PAGE || added === 0) return all;
        start += batch.length;
        return sleep(PAUSE_MS).then(function () { return next(pageNum + 1); });
      });
    }
    return next(1);
  }

  // --- envelope + download --------------------------------------------
  function countByType(anns) {
    var by = {};
    anns.forEach(function (a) {
      var t = (a && typeof a.type === "string" && a.type) || "unknown";
      by[t] = (by[t] || 0) + 1;
    });
    return by;
  }

  function finish(anns) {
    if (!anns.length) {
      ui.fail("No annotations found", "The API returned nothing. If you do have highlights, try again in a minute.");
      window.__ttExportRunning = false;
      return;
    }
    var first = anns.find(function (a) { return a && a.personId; });
    var envelope = {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      source: {
        origin: location.origin,
        api: "notes/api/v3/annotationsWithMeta",
        locale: (first && first.locale) || "eng",
        personId: (first && first.personId) || null,
        exporter: EXPORTER,
      },
      counts: { total: anns.length, byType: countByType(anns) },
      annotations: anns,
    };

    var date = new Date().toISOString().slice(0, 10);
    var name = "their-testament-annotations-" + date + ".json";
    var blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });
    var href = URL.createObjectURL(blob);

    // try an automatic download; always leave a manual link too
    var a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();

    var types = Object.keys(envelope.counts.byType)
      .map(function (k) { return envelope.counts.byType[k] + " " + k; })
      .join(", ");
    ui.set(
      "Done — " + anns.length + " annotations",
      types + ". Saved as " + name + ". If the download didn't start, use the link below.",
      100
    );
    ui.link("Download " + name, href, name);
    ui.button("Close", ui.close, false, false);
    window.__ttExportRunning = false;
  }

  // --- go -------------------------------------------------------------
  if (!/(^|\.)churchofjesuschrist\.org$/.test(location.hostname) && !window.__ttTest) {
    ui.fail(
      "Wrong site",
      "Open this on churchofjesuschrist.org while you're signed in, then click the bookmarklet again."
    );
    window.__ttExportRunning = false;
    return;
  }

  ui.set("Starting export…", "Reading your annotations from Gospel Library.", 5);
  collect().then(finish).catch(function (e) {
    var msg = String((e && e.message) || e);
    if (msg.indexOf("AUTH:") === 0) ui.fail("Not signed in", msg.slice(5));
    else ui.fail("Export failed", msg + " — nothing was saved. You can safely try again.");
    window.__ttExportRunning = false;
  });
})();
