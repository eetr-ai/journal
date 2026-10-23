"use client";

import { ChatsIcon, CornersOutIcon, type Icon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { chooseLayout, useLayout } from "../layout_store";
import { layouts, type Layout } from "../layout";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 18;

// The writing face is the sidebar mirrored: the conversation is the narrow
// column on the right once the entry has the middle.
const FACES: Record<Layout, { icon: Icon; mirrored: boolean }> = {
  conversation: { icon: ChatsIcon, mirrored: false },
  writing: { icon: SidebarSimpleIcon, mirrored: true },
  focus: { icon: CornersOutIcon, mirrored: false },
};

export interface LayoutSwitchOptions {
  t: Dictionary;
}

/**
 * Which panel has the middle of the page. Only where the panels are columns:
 * below that there is one panel at a time, and the toggles already choose it.
 */
export default function LayoutSwitch(options: LayoutSwitchOptions) {
  const current = useLayout();
  const labels = options.t.shell.layout;

  return (
    <fieldset className="hidden shrink-0 items-center gap-0.5 rounded border border-border p-0.5 md:flex">
      <legend className="sr-only">{labels.label}</legend>
      {layouts.map((layout) => {
        const Face = FACES[layout].icon;
        const chosen = layout === current;

        return (
          <button
            aria-label={labels[layout]}
            aria-pressed={chosen}
            className={`shrink-0 rounded p-1 hover:bg-surface-muted hover:text-foreground ${
              chosen ? "bg-surface-muted text-foreground" : "text-muted"
            }`}
            key={layout}
            onClick={() => chooseLayout(layout)}
            title={labels[layout]}
            type="button"
          >
            <Face mirrored={FACES[layout].mirrored} size={ICON_SIZE} />
          </button>
        );
      })}
    </fieldset>
  );
}
