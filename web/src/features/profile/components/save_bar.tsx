"use client";

import { CheckCircleIcon, FloppyDiskIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { isDirty, useSettings } from "../settings_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface SaveBarOptions {
  t: Dictionary;
  pending: boolean;
}

function Status(options: SaveBarOptions) {
  const { state } = useSettings();

  if (state.status === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-accent">
        <WarningCircleIcon size={ICON_SIZE} weight="fill" />
        {options.t.profile.saveFailed}
      </span>
    );
  }

  if (state.status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-brand">
        <CheckCircleIcon size={ICON_SIZE} weight="fill" />
        {options.t.profile.saved}
      </span>
    );
  }

  return isDirty(state) ? <span>{options.t.profile.unsaved}</span> : null;
}

export default function SaveBar(options: SaveBarOptions) {
  const { state } = useSettings();
  const busy = options.pending || state.status === "saving";

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted">
        <Status pending={options.pending} t={options.t} />
      </p>
      <button
        className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        <FloppyDiskIcon size={ICON_SIZE} weight="fill" />
        {busy ? options.t.profile.saving : options.t.profile.save}
      </button>
    </div>
  );
}
