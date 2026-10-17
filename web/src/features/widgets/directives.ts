import { widgetFrom, type Widget } from "./rules";

/**
 * Cards written out as the directives an entry keeps them as, so a card picked
 * in the editor reads back exactly as one the agent wrote. Each is held to the
 * catalog's rules first: what cannot be drawn in an entry is never written.
 */

export interface QuoteCard {
  text: string;
  by: string;
  source?: string;
  href?: string;
}

export interface SongCard {
  title: string;
  by: string;
  lines: string[];
  href?: string;
}

// A fence at the start of a line would end the card early.
const FENCE = /^:{3}/u;

// Character references are decoded in a quoted attribute, so a quote mark in a
// name cannot end the value.
function attribute(name: string, value: string): string {
  return value === ""
    ? ""
    : ` ${name}="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`;
}

function held(name: string, attributes: Record<string, string>, body: string): Widget | null {
  return widgetFrom({ name, shape: "container", attributes, body }, "entry");
}

/** `:::quote{…}` with its words, or null when the catalog would not draw it. */
export function quoteDirective(card: QuoteCard): string | null {
  const text = card.text.trim().replace(FENCE, "");
  const widget = held(
    "quote",
    { by: card.by, source: card.source ?? "", href: card.href ?? "" },
    text,
  );

  if (widget?.name !== "quote") {
    return null;
  }

  const opening = `${attribute("by", widget.by)}${attribute("source", widget.source)}${attribute("href", widget.href)}`;

  return `:::quote{${opening.trim()}}\n${widget.text}\n:::`;
}

/** `:::lyrics{…}` with its lines, or null when the catalog would not draw it. */
export function lyricsDirective(card: SongCard): string | null {
  const body = card.lines.filter((line) => !FENCE.test(line.trim())).join("\n");
  const widget = held("lyrics", { title: card.title, by: card.by, href: card.href ?? "" }, body);

  if (widget?.name !== "lyrics") {
    return null;
  }

  const opening = `${attribute("title", widget.title)}${attribute("by", widget.by)}${attribute("href", widget.href)}`;

  return `:::lyrics{${opening.trim()}}\n${widget.lines.join("\n")}\n:::`;
}
