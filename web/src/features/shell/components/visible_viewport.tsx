"use client";

import { useEffect } from "react";

/**
 * Publishes where the visible part of the window is while a keyboard is over
 * it, so a screen that must not scroll can sit on what is left. Renders
 * nothing.
 *
 * iOS is the reason this exists. `interactive-widget` is a Chrome feature;
 * Safari answers an opening keyboard by shrinking the visual viewport and
 * scrolling it down inside a layout viewport that keeps its full height. So the
 * height is not enough on its own — the top moves too, and a screen pinned only
 * by height would go on measuring from a point that has slid off-screen.
 *
 * Only while a keyboard is up. The visual viewport also moves for a rubber-band
 * at the end of a scroll and for a pinch, and a screen that followed those
 * would slide the other way from the finger dragging it. Nothing below the
 * threshold is a keyboard, and everything above it is worth following.
 */

// Smaller than any on-screen keyboard and larger than the wobble of a URL bar
// or the last few pixels of an overscroll.
const KEYBOARD_MIN_PX = 120;

export default function VisibleViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    // An arrow rather than a declaration: a hoisted one is not covered by the
    // guard above it, and this reads the viewport that guard proved is there.
    const sync = () => {
      const root = document.documentElement.style;
      const covered = window.innerHeight - viewport.height;

      if (covered < KEYBOARD_MIN_PX) {
        root.removeProperty("--visible-height");
        root.removeProperty("--visible-top");

        return;
      }

      root.setProperty("--visible-height", `${Math.round(viewport.height)}px`);
      root.setProperty("--visible-top", `${Math.round(viewport.offsetTop)}px`);
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);

    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--visible-height");
      document.documentElement.style.removeProperty("--visible-top");
    };
  }, []);

  return null;
}
