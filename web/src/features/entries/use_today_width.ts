"use client";

import { useState } from "react";
import { saveTodayWidthAction } from "@/features/profile/actions";

/**
 * How wide the entry panel is, while it is being dragged and afterwards.
 *
 * The width is local state for the length of the drag and written through only
 * on release, so a drag costs one round trip rather than one per frame.
 */
export function useTodayWidth(initial: number) {
  const [width, setWidth] = useState(initial);

  return {
    width,
    onWidth(next: number, commit: boolean) {
      setWidth(next);

      if (commit) {
        void saveTodayWidthAction(next);
      }
    },
  };
}
