import { parse } from "node-html-parser";
import type { ContentPage, Verse } from "./types.ts";
import { extractText } from "./verses.ts";

export interface ParsedTalk {
  title: string;
  speaker: string;
  role: string | null;
  kicker: string | null;
  paragraphs: Verse[]; // ref/vid = "p5", aid = data-aid, num = 1-based body ordinal
  /**
   * data-aids of the talk's furniture -- its title, byline, role, kicker.
   * A highlight on the title carries an ordinary-looking anchor (`.p1`), so it
   * cannot be spotted from the URI the way a scripture heading can; matching
   * the pid is the only reliable way to tell "this note is about the whole
   * talk" from "this highlight is broken".
   */
  furniturePids: string[];
}

/** Parse a general-conference talk content page. */
export function parseTalk(page: ContentPage): ParsedTalk {
  const root = parse(page.content.body, { blockTextElements: {} });

  const title =
    root.querySelector("h1")?.text.trim() || page.meta.title || "";

  let speaker = "";
  const sd = page.meta.structuredData;
  if (typeof sd === "string") {
    try {
      speaker = JSON.parse(sd)?.mainEntity?.author?.name ?? "";
    } catch {
      /* ignore */
    }
  }
  const byline = root.querySelector("p.author-name")?.text.trim() ?? "";
  if (!speaker && byline) speaker = byline.replace(/^By\s+/i, "");
  const role = root.querySelector("p.author-role")?.text.trim() || null;
  const kicker = root.querySelector("p.kicker")?.text.trim() || null;

  const furniturePids: string[] = [];
  for (const sel of ["h1", "p.author-name", "p.author-role", "p.kicker", "p.subtitle"]) {
    for (const el of root.querySelectorAll(sel)) {
      const aid = el.getAttribute("data-aid");
      if (aid) furniturePids.push(aid);
    }
  }

  const paragraphs: Verse[] = [];
  let n = 0;
  for (const p of root.querySelectorAll(".body-block p, .body-block li")) {
    const aid = p.getAttribute("data-aid");
    const id = p.getAttribute("id");
    if (!aid || !id) continue;
    const { text, styles } = extractText(p);
    if (!text) continue;
    n += 1;
    paragraphs.push({ ref: id, vid: id, aid, num: n, text, styles });
  }
  return { title, speaker, role, kicker, paragraphs, furniturePids };
}
