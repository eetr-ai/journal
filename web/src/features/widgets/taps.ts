import { isEntryId } from "@/features/entries/rules";
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
 * `talk` and `write` ask for an answer. `open` is only something the agent
 * should know, and waits for the next thing the reader says.
 */

export type TapAct = "talk" | "write" | "open";

export interface Tap {
  widget: "memory";
  act: TapAct;
  id: string;
  /** The entry's day, so the line can be read back without fetching it. */
  date: string;
}

const LINE = /^\[tap memory\.(talk|write|open) id=([0-9a-f-]{36}) date=(\d{4}-\d{2}-\d{2})\]$/u;

/** Opens a tap line, whole or cut short, so a title made from one is still known for one. */
const OPENING = "[tap ";

export function tapLine(tap: Tap): string {
  return `[tap ${tap.widget}.${tap.act} id=${tap.id} date=${tap.date}]`;
}

export function tapFrom(line: string): Tap | null {
  const found = LINE.exec(line.trim());

  if (!found || !isEntryId(found[2])) {
    return null;
  }

  return { widget: "memory", act: found[1] as TapAct, id: found[2], date: found[3] };
}

export function looksLikeTap(text: string): boolean {
  return text.trimStart().startsWith(OPENING);
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
  return format(t[tap.act], { date: dayText(tap.date, locale, "long") });
}

/**
 * A conversation's title, read back when it was made from a tap: a title is the
 * opening of the first message, and a conversation can open on one.
 */
export function titleText(title: string, t: WidgetsDictionary["taps"], locale: string): string {
  if (!looksLikeTap(title)) {
    return title;
  }

  const tap = tapFrom(title.split("\n")[0]);

  return tap ? tapText(tap, t, locale) : t.untitled;
}
