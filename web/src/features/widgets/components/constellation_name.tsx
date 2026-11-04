"use client";

import { LABEL_PX, SMALL_TEXT, TEXT_HALO } from "./constellation_style";

// The note's baseline below the name's, in lines of the name's size.
const NOTE_LINE = 1.2;

export interface StarNameOptions {
  name: string;
  /** Why they are here; nothing is drawn for it when empty. */
  note: string;
  strong: boolean;
  /** One screen pixel, in the picture's units. */
  px: number;
  /** The name's baseline, below the star's centre. */
  y: number;
}

/** A person's name under their star, and beneath it, smaller, why they are here. */
export default function StarName(options: StarNameOptions) {
  const size = LABEL_PX * options.px;

  return (
    <text
      className={`stroke-surface fill-foreground ${options.strong ? "font-semibold" : ""}`}
      fontSize={size}
      paintOrder="stroke"
      strokeWidth={size * TEXT_HALO}
      textAnchor="middle"
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
