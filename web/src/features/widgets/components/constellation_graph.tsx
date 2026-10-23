"use client";

import { useState } from "react";
import { groupFill } from "./constellation_style";
import { NEAREST, type Constellation } from "../constellation";
import { strokeBetween, type Layout, type Point } from "../constellation_layout";
import { isSpoke, nameOf, personText } from "../constellation_text";
import type { WidgetsDictionary } from "@/i18n/en_widgets";

type Words = WidgetsDictionary["constellation"];

export interface ConstellationGraphOptions {
  constellation: Constellation;
  layout: Layout;
  t: Words;
  /** The expanded picture: every name, the rings' names, people reachable by keyboard. */
  large: boolean;
  /** Where people are drawn, when some were dragged off the layout's places. */
  at?: Point[];
  /** Pan and zoom, as an SVG transform. */
  view?: string;
  /** The picture's accessible name. */
  label: string;
}

// Sizes in screen pixels at the size each picture is usually shown at, and how
// many of the picture's units make one of those pixels.
const CARD_SCALE = 2.6;
const LARGE_SCALE = 1.3;
const LABEL_PX = 10;
const DOT_PX = 2.6;
const DOT_PER_LINK_PX = 0.6;
const MOST_LINKS_COUNTED = 6;
const ME_PX = 6;
const HALO = 2.4;
const FOCUS_RING = 1.7;
const LINE_PX = 1;
const RING_PX = 0.75;
const CURVE_PX = 1.5;
const RING_DASH = "4 6";
// Ring names and link labels are a size down from people's names.
const SMALL_TEXT = 0.8;
// A band of the card's colour around text, so lines under it do not cut it.
const TEXT_HALO = 0.2;
const RING_NAME_LIFT_PX = 5;
const DIAMETER_PER_RADIUS = 2;
// Past this many people the card names only the innermost circle until hovered.
const CARD_NAMES_ALL = 8;
// Up to this many links, the expanded picture labels every one of them.
const LARGE_LABELS_ALL = 24;
const DIMMED = "opacity-15";
const FADE = "motion-safe:transition-opacity";

interface Drawn {
  constellation: Constellation;
  layout: Layout;
  at: Point[];
  t: Words;
  large: boolean;
  /** One screen pixel, in the picture's units. */
  px: number;
  /** The person picked out and their neighbours; null when nobody is. */
  lit: Set<number> | null;
}

function litAround(constellation: Constellation, picked: number | null): Set<number> | null {
  if (picked === null) {
    return null;
  }

  const ret = new Set([picked]);

  for (const tie of constellation.ties) {
    if (tie.from === picked || tie.to === picked) {
      ret.add(tie.from).add(tie.to);
    }
  }

  return ret;
}

function Orbits(options: { drawn: Drawn }) {
  const { layout, large, px, t } = options.drawn;

  return (
    <g aria-hidden className="fill-none stroke-border opacity-70">
      {layout.rings.map((radius, ring) => (
        <g key={radius}>
          <circle
            r={radius}
            strokeDasharray={layout.unsure && ring === NEAREST ? RING_DASH : undefined}
            strokeWidth={RING_PX * px}
          />
          {large ? (
            <text
              className="fill-muted stroke-none"
              fontSize={LABEL_PX * px * SMALL_TEXT}
              textAnchor="middle"
              y={-radius - RING_NAME_LIFT_PX * px}
            >
              {t.rings[ring]}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

function Ties(options: { drawn: Drawn }) {
  const { constellation, at, px, lit } = options.drawn;

  return (
    <g aria-hidden className="fill-none">
      {constellation.ties.map((tie) => {
        const spoke = isSpoke(constellation, tie);
        const away = lit !== null && !(lit.has(tie.from) && lit.has(tie.to));
        const look = spoke ? "stroke-muted opacity-30" : "stroke-muted opacity-70";

        return (
          <path
            className={`${FADE} ${away ? DIMMED : look}`}
            d={strokeBetween(at[tie.from], at[tie.to], spoke).path}
            key={`${tie.from}-${tie.to}`}
            strokeWidth={(spoke ? LINE_PX : CURVE_PX) * px}
          />
        );
      })}
    </g>
  );
}

function TieLabels(options: { drawn: Drawn }) {
  const { constellation, at, px, lit, large } = options.drawn;
  const all = large && lit === null && constellation.ties.length <= LARGE_LABELS_ALL;
  const shown = constellation.ties.filter(
    (tie) => tie.label !== "" && (all || (lit?.has(tie.from) && lit.has(tie.to))),
  );

  return (
    <g aria-hidden className="pointer-events-none">
      {shown.map((tie) => {
        const middle = strokeBetween(at[tie.from], at[tie.to], isSpoke(constellation, tie)).middle;

        return (
          <text
            className="fill-muted stroke-surface italic"
            fontSize={LABEL_PX * px * SMALL_TEXT}
            key={`${tie.from}-${tie.to}`}
            paintOrder="stroke"
            strokeWidth={LABEL_PX * px * TEXT_HALO}
            textAnchor="middle"
            x={middle.x}
            y={middle.y}
          >
            {tie.label}
          </text>
        );
      })}
    </g>
  );
}

interface StarOptions {
  drawn: Drawn;
  person: number;
  onPick: (person: number | null) => void;
}

function radiusOf(drawn: Drawn, person: number): number {
  const links = Math.min(drawn.layout.degree[person], MOST_LINKS_COUNTED);

  return (
    (drawn.constellation.people[person].me ? ME_PX : DOT_PX + links * DOT_PER_LINK_PX) * drawn.px
  );
}

function named(drawn: Drawn, person: number): boolean {
  const { constellation, large, lit } = drawn;
  const who = constellation.people[person];

  return (
    large ||
    who.me ||
    who.near === NEAREST ||
    constellation.focus === person ||
    constellation.people.length <= CARD_NAMES_ALL ||
    Boolean(lit?.has(person))
  );
}

function Star(options: StarOptions) {
  const { drawn, person } = options;
  const { constellation, at, px, lit, large, t } = drawn;
  const who = constellation.people[person];
  const radius = radiusOf(drawn, person);
  const fill = groupFill(who.group, who.me);

  return (
    <g
      aria-label={large ? personText(constellation, person, t) : undefined}
      className={`${FADE} ${lit !== null && !lit.has(person) ? DIMMED : ""} ${large ? "cursor-grab outline-none" : ""}`}
      data-person={person}
      onBlur={() => options.onPick(null)}
      onFocus={() => options.onPick(person)}
      onPointerEnter={() => options.onPick(person)}
      onPointerLeave={() => options.onPick(null)}
      tabIndex={large ? 0 : undefined}
      transform={`translate(${at[person].x} ${at[person].y})`}
    >
      <circle className={`${fill} opacity-20`} r={radius * HALO} />
      <circle className={fill} r={radius} />
      {constellation.focus === person ? (
        <circle
          className="fill-none stroke-highlight"
          r={radius * FOCUS_RING}
          strokeWidth={LINE_PX * px * HALO}
        />
      ) : null}
      {named(drawn, person) ? (
        <text
          className={`stroke-surface ${who.me || constellation.focus === person ? "fill-foreground font-semibold" : "fill-foreground"}`}
          fontSize={LABEL_PX * px}
          paintOrder="stroke"
          strokeWidth={LABEL_PX * px * TEXT_HALO}
          textAnchor="middle"
          y={radius * HALO + LABEL_PX * px * SMALL_TEXT}
        >
          {nameOf(constellation, person, t)}
        </text>
      ) : null}
    </g>
  );
}

/**
 * The people as a picture: rings for closeness, colour for group, size for how
 * connected. Pointing at someone, or focusing them, lights them and the people
 * they are linked to and dims the rest.
 */
export default function ConstellationGraph(options: ConstellationGraphOptions) {
  const [picked, setPicked] = useState<number | null>(null);
  const { constellation, layout, large } = options;
  const drawn: Drawn = {
    constellation,
    layout,
    at: options.at ?? layout.at,
    t: options.t,
    large,
    px: large ? LARGE_SCALE : CARD_SCALE,
    lit: litAround(constellation, picked),
  };
  const side = layout.extent * DIAMETER_PER_RADIUS;

  return (
    <div className="relative h-full w-full">
      <svg
        aria-label={options.label}
        className="h-full w-full select-none"
        role={large ? "group" : "img"}
        viewBox={`${-layout.extent} ${-layout.extent} ${side} ${side}`}
      >
        <g transform={options.view}>
          <Orbits drawn={drawn} />
          <Ties drawn={drawn} />
          {constellation.people.map((_, person) => (
            <Star drawn={drawn} key={person} onPick={setPicked} person={person} />
          ))}
          {large ? <TieLabels drawn={drawn} /> : null}
        </g>
      </svg>
      {/* The card is too small to label links in place: who someone is to the
          reader is said underneath instead. */}
      {!large && picked !== null && !constellation.people[picked].me ? (
        <p aria-hidden className="absolute bottom-0 left-0 text-xs text-muted">
          {personText(constellation, picked, options.t)}
        </p>
      ) : null}
    </div>
  );
}
