"use client";

import { useSyncExternalStore } from "react";
import { defaultLayout, isLayout, LAYOUT_KEY, type Layout } from "./layout";

/**
 * The layout this page is in, held on <html> as `data-layout`.
 *
 * The attribute is the one copy the page reads: the stylesheet arranges the
 * columns off it, and components subscribe to it here. Storage is only where it
 * is kept between visits, and the newest choice is the one written.
 *
 * The server renders the default, and the attribute is already right by then,
 * so the columns never move on hydration; only controls that show the layout
 * catch up a frame later.
 */

const listeners = new Set<() => void>();

function apply(layout: Layout) {
  document.documentElement.dataset.layout = layout;
  listeners.forEach((listener) => listener());
}

function current(): Layout {
  const value = document.documentElement.dataset.layout;

  return isLayout(value) ? value : defaultLayout;
}

/** Rearrange the page, and remember it on this device. */
export function chooseLayout(layout: Layout): void {
  apply(layout);

  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // Private windows and storage-blocking settings land here. The page is
    // still arranged; it just will not be next time.
  }
}

// Another tab on this device chose one. Storage has already changed, so this
// only has to catch the page up.
function onStorage(event: StorageEvent) {
  if (event.key === LAYOUT_KEY && isLayout(event.newValue)) {
    apply(event.newValue);
  }
}

// One storage listener for however many subscribers, held while there are any.
function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, current, () => defaultLayout);
}
