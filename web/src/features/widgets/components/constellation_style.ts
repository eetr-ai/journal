/**
 * A group's colour, by its place in the order groups first appear. Fixed
 * order, never cycled: there are as many colours as a constellation has groups.
 */

const FILLS = [
  "fill-constellation-1",
  "fill-constellation-2",
  "fill-constellation-3",
  "fill-constellation-4",
  "fill-constellation-5",
  "fill-constellation-6",
];

const SWATCHES = [
  "bg-constellation-1",
  "bg-constellation-2",
  "bg-constellation-3",
  "bg-constellation-4",
  "bg-constellation-5",
  "bg-constellation-6",
];

export function groupFill(group: number | null, me: boolean): string {
  if (me) {
    return "fill-brand";
  }

  return group === null ? "fill-muted" : FILLS[group];
}

export function groupSwatch(group: number | null): string {
  return group === null ? "bg-muted" : SWATCHES[group];
}
