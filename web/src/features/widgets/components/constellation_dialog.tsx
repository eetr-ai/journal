"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  CornersInIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import ConstellationGraph from "./constellation_graph";
import ConstellationLegend from "./constellation_legend";
import { useModal } from "@/components/confirm_dialog";
import { usePanZoom, ZOOM_STEP } from "../use_pan_zoom";
import type { Constellation } from "../constellation";
import type { Layout } from "../constellation_layout";
import type { WidgetsDictionary } from "@/i18n/en_widgets";

const ICON_SIZE = 18;

export interface ConstellationDialogOptions {
  constellation: Constellation;
  layout: Layout;
  t: WidgetsDictionary["constellation"];
  title: string;
  /** The picture's accessible name. */
  label: string;
  onClose: () => void;
}

const TOOL = "tap-target rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground";

function Tool(options: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={options.label}
      className={TOOL}
      onClick={options.onClick}
      title={options.label}
      type="button"
    >
      {options.children}
    </button>
  );
}

/**
 * The constellation large, over the page. Drag the background to pan, drag a
 * person to move them, zoom with the wheel, a pinch or the buttons. Escape and
 * the close button are the ways out; nothing moved here is kept.
 */
export default function ConstellationDialog(options: ConstellationDialogOptions) {
  const { t } = options;
  const ref = useModal(options.onClose);
  const host = useRef<HTMLDivElement>(null);
  const pan = usePanZoom(host, options.layout.at);
  const heading = useId();
  const closing = useRef<HTMLButtonElement>(null);

  // After the modal has opened, which otherwise focuses the first control in it.
  useEffect(() => closing.current?.focus(), []);

  return (
    <dialog
      aria-labelledby={heading}
      className="m-auto hidden h-[90dvh] w-[min(96vw,64rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:flex"
      onCancel={(event) => {
        event.preventDefault();
        options.onClose();
      }}
      ref={ref}
    >
      <header className="flex items-center gap-1 border-b border-border px-4 py-2">
        <h2 className="flex-1 truncate text-sm font-semibold" id={heading}>
          {options.title}
        </h2>
        <Tool label={t.zoomOut} onClick={() => pan.zoomBy(1 / ZOOM_STEP)}>
          <MagnifyingGlassMinusIcon size={ICON_SIZE} />
        </Tool>
        <Tool label={t.zoomIn} onClick={() => pan.zoomBy(ZOOM_STEP)}>
          <MagnifyingGlassPlusIcon size={ICON_SIZE} />
        </Tool>
        <Tool label={t.fit} onClick={pan.fit}>
          <CornersInIcon size={ICON_SIZE} />
        </Tool>
        <button
          aria-label={t.close}
          className={TOOL}
          onClick={options.onClose}
          ref={closing}
          title={t.close}
          type="button"
        >
          <XIcon size={ICON_SIZE} />
        </button>
      </header>
      <div className="min-h-0 flex-1 cursor-move touch-none" ref={host} {...pan.handlers}>
        <ConstellationGraph
          at={pan.at}
          constellation={options.constellation}
          label={options.label}
          large
          layout={options.layout}
          t={t}
          view={pan.transform}
        />
      </div>
      <footer className="border-t border-border px-4 py-3">
        <ConstellationLegend constellation={options.constellation} large t={t} />
      </footer>
    </dialog>
  );
}
