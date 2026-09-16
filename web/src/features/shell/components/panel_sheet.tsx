"use client";

import { useEffect } from "react";
import { ShellActionType, useShell } from "../shell_state";

export type SheetVariant = "drawer" | "entry";

/**
 * Where each panel sits at each size. This table is the whole responsive story:
 * everywhere else a panel is just a panel.
 *
 * A cover is positioned against the row of panels rather than the window, so
 * it stops below the header: the control that raised it is up there, and a
 * panel that buries its own way out is one you can only leave by guessing.
 *
 * Open and closed are `hidden` and `flex` rather than a transform, because the
 * breakpoint class then beats `hidden` on its own — a docked panel is visible
 * whatever the flag says, so nothing has to measure the window. It also takes a
 * closed panel out of the tab order and the accessibility tree for free, which
 * a transform would leave behind for a keyboard to walk into.
 */
const DOCKED: Record<SheetVariant, string> = {
  drawer:
    "absolute inset-y-0 left-0 z-20 w-[85vw] max-w-xs shadow-xl lg:static lg:z-auto lg:flex lg:w-64 lg:max-w-none lg:shadow-none",
  entry:
    "absolute inset-0 z-20 lg:w-(--today-width) md:static md:inset-auto md:z-auto md:flex md:min-w-0 md:flex-1 lg:flex-none lg:shrink-0",
};

/** Above this the panel is docked, so the backdrop must not be in the way. */
const SCRIM: Record<SheetVariant, string> = {
  drawer: "lg:hidden",
  entry: "md:hidden",
};

export interface PanelSheetOptions {
  variant: SheetVariant;
  label: string;
  /** The entry panel's stored width, which only the docked size reads. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function PanelSheet(options: PanelSheetOptions) {
  const { state, dispatch } = useShell();
  const open = state[options.variant];

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dispatch({ type: ShellActionType.Dismissed });
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dispatch]);

  return (
    <>
      {open && (
        <button
          aria-label={options.label}
          className={`absolute inset-0 z-10 cursor-default bg-black/40 ${SCRIM[options.variant]}`}
          onClick={() => dispatch({ type: ShellActionType.Dismissed })}
          type="button"
        />
      )}
      <div
        className={`${open ? "flex" : "hidden"} ${DOCKED[options.variant]}`}
        style={options.style}
      >
        {options.children}
      </div>
    </>
  );
}
