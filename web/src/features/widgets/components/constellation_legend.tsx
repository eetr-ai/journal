"use client";

import { groupSwatch } from "./constellation_style";
import type { Constellation } from "../constellation";
import type { WidgetsDictionary } from "@/i18n/en_widgets";

export interface ConstellationLegendOptions {
  constellation: Constellation;
  t: WidgetsDictionary["constellation"];
  /** Say what every channel means, not only the rings. */
  large: boolean;
}

/** The groups' colours, and what distance, colour and size stand for. */
export default function ConstellationLegend(options: ConstellationLegendOptions) {
  const { constellation, t } = options;
  const loose = constellation.people.some((person) => !person.me && person.group === null);
  const swatches = [
    ...constellation.groups.map((group, at) => ({ name: group, group: at as number | null })),
    ...(loose ? [{ name: t.others, group: null }] : []),
  ];
  const meanings = options.large ? [t.nearer, t.colour, t.size] : [t.nearer];

  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      {swatches.length > 1 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {swatches.map((swatch) => (
            <li className="flex items-center gap-1.5" key={swatch.name}>
              <span aria-hidden className={`size-2 rounded-full ${groupSwatch(swatch.group)}`} />
              {swatch.name}
            </li>
          ))}
        </ul>
      ) : null}
      <p>{meanings.join(" · ")}</p>
    </div>
  );
}
