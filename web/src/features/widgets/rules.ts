import { isEntryId } from "@/features/entries/rules";

/**
 * The widgets a reply may draw, and what it has to say for one to be drawn.
 *
 * The catalog is closed. The agent names a widget and hands it values; it never
 * supplies markup or code, and what it hands over is checked here before
 * anything renders. A name not listed, or a listed one whose values fail, is
 * not a widget: it stays the text the agent wrote.
 */

export type Widget = { name: "memory"; id: string };

type Attributes = Record<string, string | null | undefined>;

// One reader per widget: total over whatever the attributes turned out to be.
const CATALOG: Record<string, (attributes: Attributes) => Widget | null> = {
  // An id, never the words: the entry is fetched sealed and opened in the
  // browser, so a memory cannot be made up and its text never enters the chat.
  memory: (attributes) => (isEntryId(attributes.id) ? { name: "memory", id: attributes.id } : null),
};

export function widgetFrom(name: string, attributes: Attributes | null | undefined): Widget | null {
  const read = Object.hasOwn(CATALOG, name) ? CATALOG[name] : undefined;

  return read ? read(attributes ?? {}) : null;
}

// The last line, when it could be a tag still arriving: colons, a name, and
// braces not yet closed.
const TRAILING_TAG = /(?:^|\n):{2,3}([a-z][\w-]*)(\{[^}\n]*)?$/u;

/**
 * A reply as far as it can be drawn mid-stream. A widget half-written is left
 * off until it is whole, rather than flashing up as source and then turning
 * into a card. Only one that can still become a widget: a name the catalog
 * does not start with is text, and text is never held back.
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
