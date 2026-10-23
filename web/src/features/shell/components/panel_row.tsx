"use client";

import ResizeHandle from "./resize_handle";
import CoveredWhileSearching from "@/features/entries/components/covered_while_searching";
import { useTodayWidth } from "@/features/entries/use_today_width";
import { MAX_TODAY_WIDTH, MIN_TODAY_WIDTH } from "@/features/profile/types";
import { useLayout } from "../layout_store";
import type { Dictionary } from "@/i18n/en";

/**
 * Where the conversation and the handle go in each layout, at the size where
 * the panels are columns; below it these say nothing.
 *
 * Rearranged with `order` and `display` rather than by rendering the panels in
 * another order, because a panel that moves in the tree is remounted, and these
 * hold a running conversation and words not yet saved.
 *
 * The side column takes the stored width whichever panel it is, and the handle
 * stays on its leading edge: moving left still widens the column on the right.
 */
const COLUMN = {
  chat: "flex min-h-0 min-w-0 flex-1 md:min-w-64 lg:min-w-80 md:layout-writing:order-3 md:layout-writing:grow-0 md:layout-writing:basis-(--today-width) md:layout-focus:hidden",
  handle: "md:layout-writing:order-2 md:layout-focus:hidden",
};

export interface PanelRowOptions {
  t: Dictionary;
  /** The side column's stored width, which only the docked size reads. */
  width: number;
  drawer: React.ReactNode;
  chat: React.ReactNode;
  entry: React.ReactNode;
  /** Laid over the row rather than in it, and still reachable while it covers. */
  over: React.ReactNode;
}

export default function PanelRow(options: PanelRowOptions) {
  const side = useTodayWidth(options.width);
  const layout = useLayout();
  const label = layout === "writing" ? options.t.shell.resizeChat : options.t.shell.resizeToday;

  return (
    // A custom property rather than an inline width, so only a column that is
    // docked reads it; a cover never consults the stored number.
    <div
      className="relative flex min-h-0 flex-1"
      style={{ "--today-width": `${side.width}px` } as React.CSSProperties}
    >
      <CoveredWhileSearching>
        {options.drawer}
        <div className={COLUMN.chat}>{options.chat}</div>
        <ResizeHandle
          className={COLUMN.handle}
          label={label}
          max={MAX_TODAY_WIDTH}
          min={MIN_TODAY_WIDTH}
          onWidth={side.onWidth}
          width={side.width}
        />
        {options.entry}
      </CoveredWhileSearching>

      {options.over}
    </div>
  );
}
