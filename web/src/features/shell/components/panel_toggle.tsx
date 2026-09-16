"use client";

import { ListIcon, NotebookIcon } from "@phosphor-icons/react";
import { ShellActionType, useShell } from "../shell_state";
import type { SheetVariant } from "./panel_sheet";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 20;

// Each toggle hides itself at the size its panel stops being a cover and
// becomes a column — the same two breakpoints the sheet table docks at.
const PANELS = {
  drawer: {
    icon: ListIcon,
    action: ShellActionType.DrawerToggled,
    hide: "lg:hidden",
    labels: (t: Dictionary) => [t.shell.openDrawer, t.shell.closeDrawer],
  },
  entry: {
    icon: NotebookIcon,
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
  const Icon = panel.icon;

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
