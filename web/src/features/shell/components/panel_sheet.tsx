"use client";

import { useEffect } from "react";
import { ShellActionType, useShell } from "../shell_state";

export type SheetVariant = "drawer" | "entry";

/**
 * Where each panel sits at each size, and how it gets there. This table is the
 * whole responsive story: everywhere else a panel is just a panel.
 *
 * A cover is positioned against the row of panels rather than the window, so it
 * stops below the header: the control that raised it is up there, and a panel
 * that buries its own way out is one you can only leave by guessing.
 *
 * Open and closed are `hidden` and `flex` rather than a transform alone,
 * because the breakpoint class then beats `hidden` on its own — a docked panel
 * is visible whatever the flag says, so nothing has to measure the window. It
 * also takes a closed panel out of the tab order and the accessibility tree for
 * free, which a transform would leave behind for a keyboard to walk into.
 *
 * `display` is not an animatable property, which is what `transition-discrete`
 * is for: it holds the panel displayed until the slide has finished rather than
 * cutting it away at the first frame. The docked sizes undo both the transform
 * and the transition, because there the flags mean nothing and a column has
 * nowhere to slide in from.
 */
const SHEET: Record<SheetVariant, { docked: string; open: string; shut: string }> = {
  drawer: {
    docked:
      "absolute inset-y-0 left-0 z-20 w-[85vw] max-w-xs shadow-xl starting:-translate-x-full lg:static lg:z-auto lg:flex lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:transition-none",
    open: "flex translate-x-0",
    shut: "hidden -translate-x-full",
  },
  entry: {
    docked:
      "absolute inset-0 z-20 starting:translate-y-full md:static md:inset-auto md:z-auto md:flex md:min-w-0 md:flex-1 md:translate-y-0 md:transition-none lg:w-(--today-width) lg:flex-none lg:shrink-0",
    open: "flex translate-y-0",
    shut: "hidden translate-y-full",
  },
};

const MOTION =
  "transition-[display,transform] transition-discrete duration-200 ease-out motion-reduce:transition-none";

/** Above this the panel is docked, so the backdrop must not be in the way. */
const SCRIM: Record<SheetVariant, string> = {
  drawer: "lg:hidden",
  entry: "md:hidden",
};

const SCRIM_MOTION =
  "transition-[display,opacity] transition-discrete duration-200 ease-out starting:opacity-0 motion-reduce:transition-none";

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
  const sheet = SHEET[options.variant];

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
      {/* Rendered whether or not it is up, so that it has somewhere to fade
          back to: an element removed from the tree cannot transition out. */}
      <button
        aria-hidden={!open}
        aria-label={options.label}
        className={`absolute inset-0 z-10 cursor-default bg-black/40 ${
          open ? "block opacity-100" : "hidden opacity-0"
        } ${SCRIM_MOTION} ${SCRIM[options.variant]}`}
        onClick={() => dispatch({ type: ShellActionType.Dismissed })}
        tabIndex={-1}
        type="button"
      />
      <div
        className={`${open ? sheet.open : sheet.shut} ${MOTION} ${sheet.docked}`}
        style={options.style}
      >
        {options.children}
      </div>
    </>
  );
}
