"use client";

import { useEffect } from "react";

/**
 * Closes on Escape and on a press anywhere outside `box`, while `open`. Escape
 * is caught on the way down and goes no further, so a popover inside a cover
 * closes on its own rather than taking the cover with it.
 */
export function useDismiss(
  box: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function outside(event: PointerEvent) {
      if (box.current && !box.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [box, open, onClose]);
}
