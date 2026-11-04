/**
 * A constellation of the people in someone's life, read from lines that still
 * make sense to a person reading them unrendered:
 *
 *     # family                  a group, for the people who first appear under it
 *     me -- Ana (5): sister     a link; closeness 1–5 after a name, a label after a colon
 *     Pablo (3)                 somebody on their own
 *     Ana: diabetes since 40    a note on why somebody already named is here
 *
 * `rings="a|b|…"` renames the rings innermost first, the sixth being the ring
 * for people not placed; `scale` says what being nearer the centre means then.
 *
 * `me` (or `yo`) is the reader: the centre, never grouped, never given a
 * closeness. A person keeps the first group and the first closeness they were
 * given, and the first note; a note never adds anyone. A line that reads as none of the above is skipped, and anything past
 * the caps is left out rather than squeezed in.
 */

export interface Person {
  name: string;
  me: boolean;
  /** Index into the groups; null when they are in none. */
  group: number | null;
  /** 5 is the innermost circle, 1 the most distant; null when not known. */
  near: number | null;
  /** Why they are in this constellation in particular; empty when not said. */
  note: string;
}

/** Undirected: `from` and `to` are indexes into the people. */
export interface Tie {
  from: number;
  to: number;
  label: string;
}

export interface Constellation {
  name: "constellation";
  /** Empty when the agent gave none. */
  title: string;
  people: Person[];
  ties: Tie[];
  groups: string[];
  /** The one person to pick out, when the agent named one. */
  focus: number | null;
  /** Ring names innermost first, as given; an empty or missing one keeps its default. */
  rings: string[];
  /** What nearer the centre means; empty when the agent said nothing. */
  scale: string;
}

export const NEAREST = 5;
const FARTHEST = 1;
const MAX_PEOPLE = 40;
const MAX_TIES = 80;
// As many as there are group colours.
const MAX_GROUPS = 6;
const MAX_NAME_CHARS = 60;
const MAX_LABEL_CHARS = 60;
const MAX_NOTE_CHARS = 60;
const MAX_TITLE_CHARS = 80;
const MAX_RING_CHARS = 30;
const MAX_SCALE_CHARS = 80;
// The five closenesses and the ring for people not placed yet.
const RING_COUNT = 6;
const RING_SEPARATOR = "|";
const MIN_PEOPLE = 2;
// The two ends of a link.
const ENDS = 2;

const ME = "me";
const ME_WORDS = new Set([ME, "yo"]);
const HEADING = /^#+\s*(.*)$/u;
const BULLET = /^[-*]\s+/u;
// `--` is what the agent is taught; a spaced dash of any length reads the same.
const LINK = /\s+(?:--|-|—|–)\s+/u;
const NEAR = /\s*\((\d+)\)$/u;
const WORDY = /[\p{L}\p{N}]/u;

interface Drawing {
  people: Person[];
  /** Lower-cased name to index; the reader is always `me`. */
  keys: Map<string, number>;
  ties: Tie[];
  tied: Set<string>;
  groups: string[];
  group: number | null;
  /** Lower-cased name to note, applied once everybody is known. */
  notes: Map<string, string>;
}

interface Named {
  name: string;
  key: string;
  near: number | null;
}

function tidy(value: string | null | undefined, max: number): string {
  const trimmed = (value ?? "").trim().replaceAll(/\s+/gu, " ");

  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function keyOf(name: string): string {
  const lower = name.toLowerCase();

  return ME_WORDS.has(lower) ? ME : lower;
}

/** A name as written, with its closeness taken off the end when it is 1–5. */
function named(written: string): Named | null {
  const near = NEAR.exec(written);
  const name = tidy(near ? written.slice(0, near.index) : written, MAX_NAME_CHARS);
  const value = near ? Number(near[1]) : 0;

  if (!WORDY.test(name) || name.includes(":")) {
    return null;
  }

  const key = keyOf(name);
  const fits = key !== ME && value >= FARTHEST && value <= NEAREST;

  return { name, key, near: fits ? value : null };
}

function enter(drawing: Drawing, heading: string): void {
  const title = tidy(heading, MAX_NAME_CHARS);
  const at = drawing.groups.findIndex((group) => group.toLowerCase() === title.toLowerCase());

  if (title === "" || at >= 0) {
    drawing.group = title === "" ? null : at;

    return;
  }

  drawing.group = drawing.groups.length < MAX_GROUPS ? drawing.groups.push(title) - 1 : null;
}

/** The person's index, adding them if they are new; there is always room by now. */
function personAt(drawing: Drawing, person: Named): number {
  const known = drawing.keys.get(person.key);

  if (known !== undefined) {
    const kept = drawing.people[known];

    kept.near ??= person.near;

    return known;
  }

  const me = person.key === ME;

  drawing.keys.set(person.key, drawing.people.length);

  return (
    drawing.people.push({
      name: person.name,
      me,
      group: me ? null : drawing.group,
      near: person.near,
      note: "",
    }) - 1
  );
}

function hasRoom(drawing: Drawing, people: Named[]): boolean {
  const added = new Set(people.map((person) => person.key).filter((key) => !drawing.keys.has(key)));

  return drawing.people.length + added.size <= MAX_PEOPLE;
}

// Somebody on their own, or with a colon, a note on somebody.
function lone(drawing: Drawing, text: string): void {
  const colon = text.indexOf(":");
  const person = named(colon < 0 ? text : text.slice(0, colon));
  const note = colon < 0 ? "" : tidy(text.slice(colon + 1), MAX_NOTE_CHARS);

  if (!person) {
    return;
  }

  if (colon >= 0) {
    if (note !== "" && !drawing.notes.has(person.key)) {
      drawing.notes.set(person.key, note);
    }
  } else if (hasRoom(drawing, [person])) {
    personAt(drawing, person);
  }
}

function withNotes(drawing: Drawing): void {
  for (const [key, note] of drawing.notes) {
    const at = drawing.keys.get(key);

    if (at !== undefined) {
      drawing.people[at].note = note;
    }
  }
}

function link(drawing: Drawing, left: string, right: string, label: string): void {
  const one = named(left);
  const other = named(right);

  if (!one || !other || one.key === other.key || !hasRoom(drawing, [one, other])) {
    return;
  }

  const key = [one.key, other.key].toSorted().join("\n");
  const fresh = !drawing.tied.has(key) && drawing.ties.length < MAX_TIES;

  // A link said twice, or past the cap, still counts as a mention of who is in it.
  const from = personAt(drawing, one);
  const to = personAt(drawing, other);

  if (fresh) {
    drawing.tied.add(key);
    drawing.ties.push({
      from,
      to,
      label: tidy(label, MAX_LABEL_CHARS),
    });
  }
}

function read(drawing: Drawing, line: string): void {
  const text = line.trim().replace(BULLET, "");
  const heading = HEADING.exec(text);
  // Names hold no colon, so only what comes before the first one is split into
  // ends; a dash in the label is part of the label.
  const colon = text.indexOf(":");
  const sides = (colon < 0 ? text : text.slice(0, colon)).split(LINK);

  if (heading) {
    enter(drawing, heading[1]);
  } else if (sides.length === ENDS) {
    link(drawing, sides[0], sides[1], colon < 0 ? "" : text.slice(colon + 1));
  } else if (sides.length === 1 && text !== "") {
    lone(drawing, text);
  }
}

/** Groups nobody ended up in are dropped, and the rest renumbered in order. */
function withoutEmptyGroups(drawing: Drawing): { people: Person[]; groups: string[] } {
  const used = drawing.groups.filter((_, at) =>
    drawing.people.some((person) => person.group === at),
  );
  const people = drawing.people.map((person) => ({
    ...person,
    group: person.group === null ? null : used.indexOf(drawing.groups[person.group]),
  }));

  return { people, groups: used };
}

function ringsFrom(written: string | null | undefined): string[] {
  const names = (written ?? "")
    .split(RING_SEPARATOR)
    .slice(0, RING_COUNT)
    .map((name) => tidy(name, MAX_RING_CHARS));

  return names.some((name) => name !== "") ? names : [];
}

export interface WrittenConstellation {
  attributes: Record<string, string | null | undefined>;
  body: string;
}

/** A constellation with at least two people and one link between them, or null. */
export function constellationFrom(written: WrittenConstellation): Constellation | null {
  const drawing: Drawing = {
    people: [],
    keys: new Map(),
    ties: [],
    tied: new Set(),
    groups: [],
    group: null,
    notes: new Map(),
  };

  for (const line of written.body.split("\n")) {
    read(drawing, line);
  }

  withNotes(drawing);

  if (drawing.people.length < MIN_PEOPLE || drawing.ties.length === 0) {
    return null;
  }

  const focus = drawing.keys.get(keyOf(tidy(written.attributes.focus, MAX_NAME_CHARS)));

  return {
    name: "constellation",
    title: tidy(written.attributes.title, MAX_TITLE_CHARS),
    ...withoutEmptyGroups(drawing),
    ties: drawing.ties,
    focus: focus ?? null,
    rings: ringsFrom(written.attributes.rings),
    scale: tidy(written.attributes.scale, MAX_SCALE_CHARS),
  };
}
