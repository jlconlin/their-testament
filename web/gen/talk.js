import { parse } from "node-html-parser";
import { extractText } from "./verses.js";
/** Parse a general-conference talk content page. */
export function parseTalk(page) {
    const root = parse(page.content.body, { blockTextElements: {} });
    const title = root.querySelector("h1")?.text.trim() || page.meta.title || "";
    let speaker = "";
    const sd = page.meta.structuredData;
    if (typeof sd === "string") {
        try {
            speaker = JSON.parse(sd)?.mainEntity?.author?.name ?? "";
        }
        catch {
            /* ignore */
        }
    }
    const byline = root.querySelector("p.author-name")?.text.trim() ?? "";
    if (!speaker && byline)
        speaker = byline.replace(/^By\s+/i, "");
    const role = root.querySelector("p.author-role")?.text.trim() || null;
    const kicker = root.querySelector("p.kicker")?.text.trim() || null;
    const furniturePids = [];
    for (const sel of ["h1", "p.author-name", "p.author-role", "p.kicker", "p.subtitle"]) {
        for (const el of root.querySelectorAll(sel)) {
            const aid = el.getAttribute("data-aid");
            if (aid)
                furniturePids.push(aid);
        }
    }
    const paragraphs = [];
    let n = 0;
    for (const p of root.querySelectorAll(".body-block p, .body-block li")) {
        const aid = p.getAttribute("data-aid");
        const id = p.getAttribute("id");
        if (!aid || !id)
            continue;
        const { text, styles } = extractText(p);
        if (!text)
            continue;
        n += 1;
        paragraphs.push({ ref: id, vid: id, aid, num: n, text, styles });
    }
    return { title, speaker, role, kicker, paragraphs, furniturePids };
}
