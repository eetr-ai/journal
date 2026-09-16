"use client";

import { useEffect } from "react";

/**
 * How much of the layout viewport the on-screen keyboard is covering, published
 * as a custom property for whatever needs to sit above it. Renders nothing.
 *
 * iOS is the reason this exists. `interactive-widget` is a Chrome feature;
 * Safari shrinks only the visual viewport when the keyboard opens and leaves
 * the layout its full height, so a shell measured in `dvh` puts its last row
 * behind the keyboard — and with the page itself unscrollable, nothing brings
 * it back. Where the browser does resize the layout the two agree and this
 * reports nothing, so the two mechanisms never both apply.
 */
export default function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    // An arrow rather than a declaration: a hoisted one is not covered by the
    // guard above it, and this reads the viewport that guard proved is there.
    const sync = () => {
      // offsetTop counts the part scrolled out of view above, which is not the
      // keyboard's doing and must not be charged to it.
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;

      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${Math.max(0, Math.round(covered))}px`,
      );
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);

    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return null;
}
