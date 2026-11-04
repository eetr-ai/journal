"use client";

import { LABEL_PX, SMALL_TEXT, TEXT_HALO } from "./constellation_style";

// The note's baseline below the name's, in lines of the name's size.
const NOTE_LINE = 1.2;
// Past this share of the picture's half-width from the centre, a label reads
// inward from its star instead of centring on it, so it stays inside the frame.
const EDGE_SHARE = 0.4;

type Anchor = "start" | "middle" | "end";

function anchorAt(x: number, extent: number): Anchor {
  if (x > extent * EDGE_SHARE) {
    return "end";
  }

  return x < -extent * EDGE_SHARE ? "start" : "middle";
}

export interface StarNameOptions {
  name: string;
  /** Why they are here; nothing is drawn for it when empty. */
  note: string;
  strong: boolean;
  /** On the card, where every name is drawn, a size down so they fit beside each other. */
  small: boolean;
  /** One screen pixel, in the picture's units. */
  px: number;
  /** The name's baseline, below the star's centre. */
  y: number;
  /** Where the star sits across the picture, and the picture's half-width. */
  x: number;
  extent: number;
}

/** A person's name under their star, and beneath it, smaller, why they are here. */
export default function StarName(options: StarNameOptions) {
  const size = LABEL_PX * options.px * (options.small ? SMALL_TEXT : 1);

  return (
    <text
      className={`stroke-surface fill-foreground ${options.strong ? "font-semibold" : ""}`}
      fontSize={size}
      paintOrder="stroke"
      strokeWidth={size * TEXT_HALO}
      textAnchor={anchorAt(options.x, options.extent)}
      y={options.y}
    >
      {options.name}
      {options.note === "" ? null : (
        <tspan
          className="fill-muted italic"
          dy={size * NOTE_LINE}
          fontSize={size * SMALL_TEXT}
          x={0}
        >
          {options.note}
        </tspan>
      )}
    </text>
  );
}
