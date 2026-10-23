import { NEAREST, type Constellation, type Person } from "./constellation";

/**
 * Where each person sits, so that every channel means something: the distance
 * from the centre is how close they are to the reader, the direction is the
 * group they belong to. Deterministic — the same constellation always draws
 * the same picture — and settled before it is drawn, so nothing moves.
 *
 * Coordinates are centred on the reader.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  at: Point[];
  /** Radius of every ring drawn, innermost first; the last is the unsure one when present. */
  rings: number[];
  /** Whether anybody's closeness is unknown, which puts them on an extra ring. */
  unsure: boolean;
  /** Half the width of the square the picture fits in. */
  extent: number;
  degree: number[];
}

export const RING_GAP = 60;
// The reader's own space: the first ring sits this many gaps out, not one.
const FIRST_RING = 1.5;
const PADDING = 36;
const HALF = 0.5;
const TOP = -Math.PI * HALF;
const FULL_TURN = Math.PI / HALF;
// A wedge at the top kept clear, where the rings carry their names.
const CLEAR_WEDGE = 0.5;
// The arc two neighbours on a ring keep between them, room for a label.
const MIN_ARC = 52;
const RELAX_PASSES = 32;
const LOWEST_FIRST = -1;

// Hundredths of a unit. Engines may differ in the last bit of a cosine, and a
// picture drawn on the server has to match the one the browser draws.
const PRECISION = 100;

function settled(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

export function radiusOf(ring: number): number {
  return ring === 0 ? 0 : (ring - 1 + FIRST_RING) * RING_GAP;
}

/** 1 for the nearest ring out to NEAREST for the farthest; one more when unknown. */
export function ringOf(person: Person): number {
  if (person.me) {
    return 0;
  }

  return person.near === null ? NEAREST + 1 : NEAREST + 1 - person.near;
}

// Closest first, unknown last, then by name: a stable order inside a sector.
function closerFirst(people: Person[]) {
  return (one: number, other: number): number => {
    const a = people[one];
    const b = people[other];

    if (a.near !== b.near) {
      return (b.near ?? 0) - (a.near ?? 0);
    }

    return a.name.toLowerCase() < b.name.toLowerCase() ? LOWEST_FIRST : 1;
  };
}

/** The people of each group in order, and the ungrouped last, as index lists. */
function sectorsOf(constellation: Constellation): number[][] {
  const ret: number[][] = [...constellation.groups.map(() => []), []];

  constellation.people.forEach((person, at) => {
    if (!person.me) {
      ret[person.group ?? constellation.groups.length].push(at);
    }
  });

  const order = closerFirst(constellation.people);

  return ret.filter((sector) => sector.length > 0).map((sector) => sector.toSorted(order));
}

/** Each person's angle: a sector per group, sized by how many are in it. */
function anglesOf(constellation: Constellation): number[] {
  const ret = constellation.people.map(() => 0);
  const sectors = sectorsOf(constellation);
  const total = sectors.reduce((sum, sector) => sum + sector.length, 0);
  const share = (FULL_TURN - CLEAR_WEDGE) / Math.max(total, 1);
  let start = TOP + CLEAR_WEDGE * HALF;

  for (const sector of sectors) {
    sector.forEach((at, place) => {
      ret[at] = start + share * (place + HALF);
    });
    start += share * sector.length;
  }

  return ret;
}

/** Pushes neighbours on one ring apart until each pair keeps its arc, never past the wedge. */
function relaxRing(angles: number[], members: number[], radius: number): void {
  const low = TOP + CLEAR_WEDGE * HALF;
  const high = low + FULL_TURN - CLEAR_WEDGE;
  const least = Math.min(MIN_ARC / radius, (high - low) / members.length);
  const order = members.toSorted((one, other) => angles[one] - angles[other]);

  for (let pass = 0; pass < RELAX_PASSES; pass += 1) {
    for (let at = 1; at < order.length; at += 1) {
      const gap = angles[order[at]] - angles[order[at - 1]];
      const push = Math.max(least - gap, 0) * HALF;

      angles[order[at - 1]] = Math.max(angles[order[at - 1]] - push, low);
      angles[order[at]] = Math.min(angles[order[at]] + push, high);
    }
  }
}

function degreeOf(constellation: Constellation): number[] {
  const ret = constellation.people.map(() => 0);

  for (const tie of constellation.ties) {
    ret[tie.from] += 1;
    ret[tie.to] += 1;
  }

  return ret;
}

export function layoutOf(constellation: Constellation): Layout {
  const angles = anglesOf(constellation);
  const rings = constellation.people.map(ringOf);
  const unsure = rings.includes(NEAREST + 1);
  const count = unsure ? NEAREST + 1 : NEAREST;

  for (let ring = 1; ring <= count; ring += 1) {
    const members = rings.flatMap((at, person) => (at === ring ? [person] : []));

    relaxRing(angles, members, radiusOf(ring));
  }

  return {
    at: angles.map((angle, person) => ({
      x: settled(radiusOf(rings[person]) * Math.cos(angle)),
      y: settled(radiusOf(rings[person]) * Math.sin(angle)),
    })),
    rings: Array.from({ length: count }, (_, ring) => radiusOf(ring + 1)),
    unsure,
    extent: radiusOf(count) + PADDING,
    degree: degreeOf(constellation),
  };
}

// How far a link between two people bows out of a straight line, as a share of its length.
const BEND = 0.16;

export interface Stroke {
  path: string;
  /** Where its label sits. */
  middle: Point;
}

/** A straight spoke out of the centre, or a gentle curve between two others. */
export function strokeBetween(one: Point, other: Point, spoke: boolean): Stroke {
  const middle = { x: (one.x + other.x) * HALF, y: (one.y + other.y) * HALF };

  if (spoke) {
    return { path: `M${one.x} ${one.y}L${other.x} ${other.y}`, middle };
  }

  const control = {
    x: middle.x - (other.y - one.y) * BEND,
    y: middle.y + (other.x - one.x) * BEND,
  };

  return {
    path: `M${one.x} ${one.y}Q${control.x} ${control.y} ${other.x} ${other.y}`,
    // A quadratic's halfway point is halfway between its middle and its control.
    middle: { x: (middle.x + control.x) * HALF, y: (middle.y + control.y) * HALF },
  };
}
