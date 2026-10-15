import { isEntryId } from "@/features/entries/rules";

/**
 * The widgets a reply may draw, and what it has to say for one to be drawn.
 *
 * The catalog is closed. The agent names a widget and hands it values; it never
 * supplies markup or code, and what it hands over is checked here before
 * anything renders. A name not listed, or a listed one whose values fail, is
 * not a widget: it stays the text the agent wrote.
 *
 * Entries are named by id, never by their words: they are fetched sealed and
 * opened in the browser, so a memory or a search hit cannot be made up and an
 * entry's text never enters the chat. Quotes and lyrics are the agent's own
 * words to show, so they carry their text, and are held to an excerpt.
 */

export type Widget =
  | { name: "memory"; id: string }
  | { name: "search"; query: string; ids: string[] }
  | { name: "quote"; text: string; by: string; source: string; href: string }
  | { name: "lyrics"; title: string; by: string; lines: string[]; href: string; cut: boolean };

type Attributes = Record<string, string | null | undefined>;

/** A leaf is one line, `::name{…}`; a container has a body, `:::name{…}` to `:::`. */
export type Shape = "leaf" | "container";

interface Written {
  attributes: Attributes;
  /** The lines between the fences, for a container. */
  body: string;
}

const MAX_HITS = 8;
const MAX_QUERY_CHARS = 200;
const MAX_NAME_CHARS = 160;
// About three sentences: a quote is a line worth keeping, not a passage.
const MAX_QUOTE_CHARS = 600;
// A verse or a chorus. Past that it is the song, and the link is for the song.
const MAX_LYRIC_LINES = 8;

function clip(value: string | null | undefined, max: number): string {
  const trimmed = (value ?? "").trim().replaceAll(/\s+/gu, " ");

  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** A link a reader may follow: https only, or nothing. */
function linkFrom(value: string | null | undefined): string {
  try {
    const url = new URL(value ?? "");

    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function searchFrom({ attributes }: Written): Widget | null {
  const ids = (attributes.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(isEntryId);
  const query = clip(attributes.q, MAX_QUERY_CHARS);

  return ids.length > 0
    ? { name: "search", query, ids: [...new Set(ids)].slice(0, MAX_HITS) }
    : null;
}

function quoteFrom({ attributes, body }: Written): Widget | null {
  const text = clip(body, MAX_QUOTE_CHARS);
  const by = clip(attributes.by, MAX_NAME_CHARS);

  if (text === "" || by === "") {
    return null;
  }

  const source = clip(attributes.source, MAX_NAME_CHARS);

  return { name: "quote", text, by, source, href: linkFrom(attributes.href) };
}

function lyricsFrom({ attributes, body }: Written): Widget | null {
  const title = clip(attributes.title, MAX_NAME_CHARS);
  const by = clip(attributes.by, MAX_NAME_CHARS);
  // Blank lines are kept: they are where one verse ends and the next begins.
  const all = body.split("\n").map((line) => line.trim());
  const sung = all.filter((line) => line !== "");
  const lines = sung.length > MAX_LYRIC_LINES ? upTo(all, MAX_LYRIC_LINES) : all;

  if (title === "" || by === "" || sung.length === 0) {
    return null;
  }

  return {
    name: "lyrics",
    title,
    by,
    lines: trimBlank(lines),
    href: linkFrom(attributes.href),
    cut: sung.length > MAX_LYRIC_LINES,
  };
}

/** The lines up to and including the `count`th one with words in it. */
function upTo(lines: string[], count: number): string[] {
  const ret: string[] = [];
  let seen = 0;

  for (const line of lines) {
    if (seen === count) {
      break;
    }

    ret.push(line);
    seen += line === "" ? 0 : 1;
  }

  return ret;
}

function trimBlank(lines: string[]): string[] {
  const first = lines.findIndex((line) => line !== "");
  const last = lines.findLastIndex((line) => line !== "");

  return lines.slice(first, last + 1);
}

const CATALOG: Record<string, { shape: Shape; read: (written: Written) => Widget | null }> = {
  memory: {
    shape: "leaf",
    read: ({ attributes }) =>
      isEntryId(attributes.id) ? { name: "memory", id: attributes.id } : null,
  },
  search: { shape: "leaf", read: searchFrom },
  quote: { shape: "container", read: quoteFrom },
  lyrics: { shape: "container", read: lyricsFrom },
};

/** A widget, if `name` is in the catalog in this shape and its values hold. */
export function widgetFrom(
  name: string,
  shape: Shape,
  attributes: Attributes | null | undefined,
  body = "",
): Widget | null {
  const entry = Object.hasOwn(CATALOG, name) ? CATALOG[name] : undefined;

  return entry?.shape === shape ? entry.read({ attributes: attributes ?? {}, body }) : null;
}

// The last line, when it could be a tag still arriving: colons, a name, and
// braces not yet closed.
const TRAILING_TAG = /(?:^|\n):{2,3}([a-z][\w-]*)(\{[^}\n]*)?$/u;

/**
 * A reply as far as it can be drawn mid-stream. A widget half-written is left
 * off until it is whole, rather than flashing up as source and then turning
 * into a card. Only one that can still become a widget: a name the catalog
 * does not start with is text, and text is never held back.
 *
 * A container whose opening line is whole is drawn while its body arrives, so
 * a quote or a song fills its card the way prose fills the reply.
 */
export function withoutUnfinished(text: string): string {
  const found = TRAILING_TAG.exec(text);

  if (!found) {
    return text;
  }

  const [, name, braces] = found;
  const coming = Object.keys(CATALOG).some((known) =>
    braces === undefined ? known.startsWith(name) : known === name,
  );

  return coming ? text.slice(0, found.index) : text;
}
