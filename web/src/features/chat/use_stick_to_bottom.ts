"use client";

import { useEffect, useRef, type UIEvent } from "react";

/**
 * Keeps a scrolling region pinned to its newest content — but only for a reader
 * who is already there.
 *
 * Following along and being dragged along are different things: somebody who
 * has scrolled up to re-read what was said ten minutes ago is doing that on
 * purpose, and yanking them back down every time a token lands is the worst
 * thing a chat panel does. So the pin releases the moment they leave the bottom
 * and takes hold again when they come back to it.
 */

// How far from the bottom still counts as being at it. A line's worth, so a
// reader who is a few pixels off — or whose last line just grew — is not
// treated as having scrolled away.
const NEAR_BOTTOM_PX = 64;

export function useStickToBottom(written: number) {
  const region = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const at = event.currentTarget;

    following.current = at.scrollHeight - at.scrollTop - at.clientHeight <= NEAR_BOTTOM_PX;
  }

  useEffect(() => {
    const at = region.current;

    // Nothing written is nothing to scroll to, and the empty state is centred
    // rather than stacked — pinning it would fight its own layout.
    if (at && following.current && written > 0) {
      // Instant, not smooth: a smooth scroll that restarts on every token never
      // arrives, and the destination has moved by the time it would have.
      at.scrollTop = at.scrollHeight;
    }
  }, [written]);

  return { region, onScroll };
}
