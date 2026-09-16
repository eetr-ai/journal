"use client";

import { useRef } from "react";

const KEYBOARD_STEP = 24;

export interface ResizeHandleOptions {
  width: number;
  min: number;
  max: number;
  label: string;
  /** Live while the pointer is down, then once more on release with `commit`. */
  onWidth: (width: number, commit: boolean) => void;
}

/**
 * The drag handle on the leading edge of the panel beside it. It holds no width
 * of its own: the panel it resizes is the one that has to be that wide, so the
 * number lives there and this reports movement against it.
 *
 * Hidden below the size at which that panel is a column, because a rule you
 * drag sideways is not something a thumb can do, and `display: none` is what
 * makes it unreachable by tab and by pointer rather than merely invisible.
 */
export default function ResizeHandle(options: ResizeHandleOptions) {
  const start = useRef({ x: 0, width: 0 });

  function clamp(value: number) {
    return Math.min(Math.max(Math.round(value), options.min), options.max);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, width: options.width };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    // The handle is on the left edge of a right-hand panel, so moving left
    // makes it wider.
    options.onWidth(clamp(start.current.width + (start.current.x - event.clientX)), false);
  }

  // The one end a drag has. A pointer released normally and a pointer taken
  // away — by a cancel, by the window losing it — both arrive here, and the
  // second used to leave the width on screen and unsaved until something else
  // wrote it.
  function onLostPointerCapture() {
    options.onWidth(options.width, true);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowLeft: KEYBOARD_STEP, ArrowRight: -KEYBOARD_STEP }[event.key];

    if (step === undefined) {
      return;
    }

    event.preventDefault();
    options.onWidth(clamp(options.width + step), true);
  }

  return (
    // A button rather than a separator with a tabindex: both are accessible
    // names for a splitter, and this one is interactive by default, so it is
    // keyboard-operable without asking anyone to trust a role.
    <button
      aria-label={options.label}
      className="hidden w-1 shrink-0 cursor-col-resize border-0 bg-border p-0 transition-colors hover:bg-brand focus:bg-brand focus:outline-none lg:block"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onLostPointerCapture={onLostPointerCapture}
      type="button"
    />
  );
}
