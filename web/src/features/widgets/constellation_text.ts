import { format } from "@/i18n/format";
import { NEAREST, type Constellation, type Tie } from "./constellation";
import type { WidgetsDictionary } from "@/i18n/en_widgets";

/**
 * A constellation in words, for whoever cannot see the picture: each person
 * with who they are to the reader, their group and how close, then the links
 * between others.
 */

type Words = WidgetsDictionary["constellation"];

const SEPARATOR = " — ";

/** The ring's name, the agent's when it gave one. Ring 0 is the innermost. */
export function ringName(constellation: Constellation, ring: number, t: Words): string {
  return constellation.rings[ring] || t.rings[ring];
}

/** What distance from the centre means, or empty when renamed rings leave it unsaid. */
export function scaleOf(constellation: Constellation, t: Words): string {
  if (constellation.scale !== "") {
    return constellation.scale;
  }

  return constellation.rings.length === 0 ? t.nearer : "";
}

function closenessOf(constellation: Constellation, at: number, t: Words): string {
  const { near, me } = constellation.people[at];

  // The reader is the centre, on no ring.
  if (me) {
    return "";
  }

  if (constellation.rings.length > 0) {
    return ringName(constellation, near === null ? NEAREST : NEAREST - near, t);
  }

  return near === null
    ? t.unknown
    : format(t.closeness, { near: String(near), of: String(NEAREST) });
}

export function nameOf(constellation: Constellation, at: number, t: Words): string {
  const person = constellation.people[at];

  return person.me ? t.you : person.name;
}

/** The tie's other end, when one end is the reader. */
function spokeTo(constellation: Constellation, tie: Tie): number | null {
  if (constellation.people[tie.from].me) {
    return tie.to;
  }

  return constellation.people[tie.to].me ? tie.from : null;
}

export function isSpoke(constellation: Constellation, tie: Tie): boolean {
  return spokeTo(constellation, tie) !== null;
}

export function personText(constellation: Constellation, at: number, t: Words): string {
  const person = constellation.people[at];
  const relation = constellation.ties.find((tie) => spokeTo(constellation, tie) === at)?.label;
  const group = person.group === null ? undefined : constellation.groups[person.group];
  const closeness = closenessOf(constellation, at, t);

  return [person.name, relation, person.note, group, closeness].filter(Boolean).join(SEPARATOR);
}

export function tieText(constellation: Constellation, tie: Tie, t: Words): string {
  const between = format(t.between, {
    one: nameOf(constellation, tie.from, t),
    other: nameOf(constellation, tie.to, t),
  });

  return tie.label === "" ? between : `${between}: ${tie.label}`;
}

/** Everybody but the reader, then every link that is not a spoke from them. */
export function linesOf(constellation: Constellation, t: Words): string[] {
  const people = constellation.people.flatMap((person, at) =>
    person.me ? [] : [personText(constellation, at, t)],
  );
  const ties = constellation.ties
    .filter((tie) => !isSpoke(constellation, tie))
    .map((tie) => tieText(constellation, tie, t));

  return [...people, ...ties];
}
