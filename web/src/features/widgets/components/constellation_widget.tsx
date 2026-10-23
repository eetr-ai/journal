"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react";
import ConstellationDialog from "./constellation_dialog";
import ConstellationGraph from "./constellation_graph";
import ConstellationLegend from "./constellation_legend";
import WidgetFrame, { WIDGET_BUTTON } from "./widget_frame";
import { layoutOf } from "../constellation_layout";
import { linesOf } from "../constellation_text";
import { format } from "@/i18n/format";
import type { Constellation } from "../constellation";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface ConstellationWidgetOptions {
  constellation: Constellation;
  t: Dictionary;
}

/**
 * The people in someone's life as a small sky: the reader in the middle, each
 * person as far out as they are from them, coloured by their circle. The card
 * is a glance; expanded, it can be panned, zoomed and read name by name.
 */
export default function ConstellationWidget(options: ConstellationWidgetOptions) {
  const { constellation } = options;
  const t = options.t.widgets.constellation;
  const [open, setOpen] = useState(false);
  // Stable, because the dialog reopens whenever the way it is closed changes.
  const close = useCallback(() => setOpen(false), []);
  const layout = useMemo(() => layoutOf(constellation), [constellation]);
  const title = constellation.title === "" ? t.title : constellation.title;
  const others = constellation.people.filter((person) => !person.me).length;
  const label = format(t.picture, { title, count: String(others) });

  return (
    <WidgetFrame
      actions={
        <button
          className={`${WIDGET_BUTTON} flex items-center gap-1.5`}
          onClick={() => setOpen(true)}
          type="button"
        >
          <ArrowsOutSimpleIcon aria-hidden size={ICON_SIZE} />
          {t.expand}
        </button>
      }
      label={<span className="font-semibold text-brand-strong">{t.label}</span>}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="h-80">
        <ConstellationGraph
          constellation={constellation}
          label={label}
          large={false}
          layout={layout}
          t={t}
        />
      </div>
      <ConstellationLegend constellation={constellation} large={false} t={t} />
      <div className="sr-only">
        <p>{t.list}</p>
        <ul>
          {linesOf(constellation, t).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {open ? (
        <ConstellationDialog
          constellation={constellation}
          label={label}
          layout={layout}
          onClose={close}
          t={t}
          title={title}
        />
      ) : null}
    </WidgetFrame>
  );
}
