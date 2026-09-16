"use client";

import { useEffect } from "react";

/**
 * Publishes where the visible part of the window actually is, so a screen that
 * must not scroll can sit exactly on it. Renders nothing.
 *
 * iOS is the reason this exists. `interactive-widget` is a Chrome feature;
 * Safari answers an opening keyboard by shrinking the visual viewport and
 * scrolling it down inside a layout viewport that keeps its full height. So the
 * height is not enough on its own — the top moves too, and a screen pinned only
 * by height would still be measuring from a point that has slid off-screen.
 *
 * Both are published raw rather than as a keyboard height. Subtracting one from
 * the other is what hid the bug the first time: the scroll offset and the
 * keyboard are close to the same number, and the difference came out as zero.
 */
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
