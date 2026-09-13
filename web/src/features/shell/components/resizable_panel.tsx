"use client";

import { useRef, useState } from "react";

const KEYBOARD_STEP = 24;

export interface ResizablePanelOptions {
  initialWidth: number;
  min: number;
  max: number;
  label: string;
  /** Called once when the drag ends, never while it is moving. */
  onCommit: (width: number) => void;
  children: React.ReactNode;
}

/**
 * A panel with a drag handle on its leading edge. Width is local state while
 * the pointer is down and is written through only on release, so a drag is one
 * round trip rather than one per frame.
 */
export default function ResizablePanel(options: ResizablePanelOptions) {
  const [width, setWidth] = useState(options.initialWidth);
  const start = useRef({ x: 0, width: 0 });

  function clamp(value: number) {
    return Math.min(Math.max(Math.round(value), options.min), options.max);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, width };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    // The handle is on the left edge of a right-hand panel, so moving left
    // makes it wider.
    setWidth(clamp(start.current.width + (start.current.x - event.clientX)));
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    options.onCommit(width);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowLeft: KEYBOARD_STEP, ArrowRight: -KEYBOARD_STEP }[event.key];

    if (step === undefined) {
      return;
    }

    event.preventDefault();

    const next = clamp(width + step);

    setWidth(next);
    options.onCommit(next);
  }

  return (
    <div className="flex shrink-0" style={{ width }}>
      {/* A button rather than a separator with a tabindex: both are accessible
          names for a splitter, and this one is interactive by default, so it is
          keyboard-operable without asking anyone to trust a role. */}
      <button
        aria-label={options.label}
        className="w-1 shrink-0 cursor-col-resize border-0 bg-border p-0 transition-colors hover:bg-brand focus:bg-brand focus:outline-none"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      />
      <div className="flex min-w-0 flex-1 flex-col">{options.children}</div>
    </div>
  );
}
