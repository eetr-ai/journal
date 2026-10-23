import { isEntryId } from "@/features/entries/rules";
import { isPersonId } from "@/features/people/rules";
import { format } from "@/i18n/format";
import { dayText } from "./when";
import type { WidgetsDictionary } from "@/i18n/en_widgets";

/**
 * A tap on a widget, as the conversation records it.
 *
 * A tap travels inside the message, as a line of its own ahead of anything
 * typed, so the agent reads it as part of the turn and the stored conversation
 * keeps it with no field of its own. The line is meant for the model; the
 * reader is shown what it means, rebuilt from the line, so a reopened
 * conversation reads the same in either language.
 *
 * `talk`, `write` and `add` ask for an answer. `open` is only something the
 * agent should know, and waits for the next thing the reader says.
 *
 * A memory tap names its entry, and a birthday tap its person, by id: what
 * they hold is sealed and stays out of the line. An add tap names what it adds
 * by its title, who it is by and how it begins: enough for the agent to find
 * that one card in what it said, even beside another from the same author or
 * song.
 */

export type MemoryAct = "talk" | "write" | "open";

export type Tap =
  | {
      widget: "memory";
      act: MemoryAct;
      id: string;
      /** The entry's day, so the line can be read back without fetching it. */
      date: string;
    }
  | {
      widget: "birthday";
      act: "talk";
      id: string;
      /** The day the birthday falls on. */
      date: string;
    }
  | {
      widget: "quote" | "lyrics";
      act: "add";
      title: string;
      by: string;
      /** How the excerpt begins: what tells this card from another by the same hand. */
      start: string;
    };

const MEMORY_LINE =
  /^\[tap memory\.(talk|write|open) id=([0-9a-f-]{36}) date=(\d{4}-\d{2}-\d{2})\]$/u;
const BIRTHDAY_LINE = /^\[tap birthday\.talk id=([0-9a-f-]{36}) date=(\d{4}-\d{2}-\d{2})\]$/u;
const ADD_LINE =
  /^\[tap (quote|lyrics)\.add title="([^"\]\n]*)" by="([^"\]\n]*)" start="([^"\]\n]*)"\]$/u;

// A value inside a tap line cannot close its quotes or the line.
function quoted(value: string): string {
  return value.replaceAll(/["\]\n]/gu, "'");
}

export function tapLine(tap: Tap): string {
  switch (tap.widget) {
    case "memory":
    case "birthday":
      return `[tap ${tap.widget}.${tap.act} id=${tap.id} date=${tap.date}]`;
    default:
      return `[tap ${tap.widget}.add title="${quoted(tap.title)}" by="${quoted(tap.by)}" start="${quoted(tap.start)}"]`;
  }
}

/** A day that is on the calendar: 2025-02-31 has the shape of one and is not. */
function isRealDay(day: string): boolean {
  const [year, month, date] = day.split("-").map(Number);
  const at = new Date(Date.UTC(year, month - 1, date));

  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === date;
}

function memoryFrom(line: string): Tap | null {
  const memory = MEMORY_LINE.exec(line);

  return memory && isEntryId(memory[2]) && isRealDay(memory[3])
    ? { widget: "memory", act: memory[1] as MemoryAct, id: memory[2], date: memory[3] }
    : null;
}

function birthdayFrom(line: string): Tap | null {
  const birthday = BIRTHDAY_LINE.exec(line);

  return birthday && isPersonId(birthday[1]) && isRealDay(birthday[2])
    ? { widget: "birthday", act: "talk", id: birthday[1], date: birthday[2] }
    : null;
}

function addFrom(line: string): Tap | null {
  const added = ADD_LINE.exec(line);

  return added
    ? {
        widget: added[1] as "quote" | "lyrics",
        act: "add",
        title: added[2],
        by: added[3],
        start: added[4],
      }
    : null;
}

// The line exactly as tapLine writes it. Not trimmed: an indented line is one
// somebody typed, and what they typed is never mistaken for a tap.
export function tapFrom(line: string): Tap | null {
  return memoryFrom(line) ?? birthdayFrom(line) ?? addFrom(line);
}

/** A message as it is sent: the taps first, one per line, then what was typed. */
export function withTaps(taps: Tap[], typed: string): string {
  return [...taps.map(tapLine), typed].filter((part) => part !== "").join("\n");
}

/**
 * A turn the reader sent, split back into the taps it carried and what they
 * typed. Only leading lines count: a tap quoted mid-message is something said.
 */
export function splitTaps(text: string): { taps: Tap[]; typed: string } {
  const lines = text.split("\n");
  const taps: Tap[] = [];
  let at = 0;

  for (; at < lines.length; at += 1) {
    const tap = tapFrom(lines[at]);

    if (!tap) {
      break;
    }

    taps.push(tap);
  }

  return { taps, typed: lines.slice(at).join("\n") };
}

/** Whether a tap is one the agent should answer now. */
export function asksForAnswer(tap: Tap): boolean {
  return tap.act !== "open";
}

/** What a tap meant, in the reader's words. */
export function tapText(tap: Tap, t: WidgetsDictionary["taps"], locale: string): string {
  switch (tap.widget) {
    case "memory":
      return format(t[tap.act], { date: dayText(tap.date, locale, "long") });
    case "birthday":
      return format(t.birthdayTalk, { date: dayText(tap.date, locale, "long") });
    case "quote":
      return format(t.quoteAdd, { by: tap.by });
    default:
      return format(t.lyricsAdd, { title: tap.title, by: tap.by });
  }
}

/**
 * A conversation's title, read back when it was made from a tap: a title is the
 * first line of the first message, and a conversation can open on one. A tap
 * line is shorter than any title is cut to, so it is either whole or not a tap,
 * and anything that is not one is shown as written.
 */
export function titleText(title: string, t: WidgetsDictionary["taps"], locale: string): string {
  const tap = tapFrom(title);

  return tap ? tapText(tap, t, locale) : title;
}

// Long enough to tell two excerpts apart, short enough to stay one line.
const START_CHARS = 60;

/** The opening words of an excerpt, cut at a word, for an add tap to name it by. */
export function startOf(text: string): string {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length <= START_CHARS) {
    return flat;
  }

  const cut = flat.slice(0, START_CHARS);
  const space = cut.lastIndexOf(" ");

  return space > 0 ? cut.slice(0, space) : cut;
}
