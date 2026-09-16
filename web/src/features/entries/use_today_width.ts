"use client";

import { useRef, useState } from "react";
import { saveTodayWidthAction } from "@/features/profile/actions";

/**
 * How wide the entry panel is, while it is being dragged and afterwards.
 *
 * The width is local state for the length of the drag and written through only
 * on release, so a drag costs one round trip rather than one per frame.
 *
 * Commits queue rather than race. A held arrow key commits on every repeat, and
 * storing a width is a read and then a write of the whole profile, so two in
 * flight at once can finish in the other order and leave a width nobody chose.
 * Only the newest is ever sent: a commit that has already been overtaken is not
 * worth a request.
 */
export function useTodayWidth(initial: number) {
  const [width, setWidth] = useState(initial);
  const queued = useRef<number | null>(null);
  const sending = useRef(false);

  async function drain() {
    sending.current = true;

    while (queued.current !== null) {
      const next = queued.current;

      queued.current = null;

      // A width that would not store is not worth interrupting anyone over —
      // the panel on screen is still the size they dragged it to, and the next
      // commit tries again.
      await saveTodayWidthAction(next).catch(() => undefined);
    }

    sending.current = false;
  }

  return {
    width,
    onWidth(next: number, commit: boolean) {
      setWidth(next);

      if (!commit) {
        return;
      }

      queued.current = next;

      if (!sending.current) {
        void drain();
      }
    },
  };
}
