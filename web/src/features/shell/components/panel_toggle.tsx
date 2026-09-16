"use client";

import { ChatCircleIcon, ListIcon, NotebookIcon, XIcon } from "@phosphor-icons/react";
import { ShellActionType, useShell } from "../shell_state";
import type { SheetVariant } from "./panel_sheet";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 20;

// Both hide themselves at the width their panels stop being covers and become
// columns, which is the one breakpoint the sheet table docks at.
//
// Two icons apiece: what this opens, and what it goes back to. A control whose
// face never changes is one that says what it is rather than what it does, and
// on a phone where the panel it opened is covering everything, what it does is
// the only useful half.
const PANELS = {
  drawer: {
    icons: [ListIcon, XIcon],
    action: ShellActionType.DrawerToggled,
    hide: "md:hidden",
    labels: (t: Dictionary) => [t.shell.openDrawer, t.shell.closeDrawer],
  },
  entry: {
    icons: [NotebookIcon, ChatCircleIcon],
    action: ShellActionType.EntryToggled,
    hide: "md:hidden",
    labels: (t: Dictionary) => [t.shell.openToday, t.shell.closeToday],
  },
} as const;

export interface PanelToggleOptions {
  panel: SheetVariant;
  t: Dictionary;
}

export default function PanelToggle(options: PanelToggleOptions) {
  const { state, dispatch } = useShell();
  const panel = PANELS[options.panel];
  const open = state[options.panel];
  const [show, hide] = panel.labels(options.t);
  const [Closed, Open] = panel.icons;
  const Icon = open ? Open : Closed;

  return (
    <button
      aria-expanded={open}
      aria-label={open ? hide : show}
      className={`tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground ${panel.hide}`}
      onClick={() => dispatch({ type: panel.action })}
      type="button"
    >
      <Icon size={ICON_SIZE} />
    </button>
  );
}
