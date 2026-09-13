"use client";

import { SettingsActionType, useSettings } from "../settings_state";
import type { ProfileDraft } from "../rules";

export interface TextFieldOptions {
  field: keyof ProfileDraft;
  label: string;
  hint?: string;
  error?: string;
  type?: "text" | "email";
}

export default function TextField(options: TextFieldOptions) {
  const { state, dispatch } = useSettings();
  const id = `profile-${options.field}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {options.label}
      </label>
      <input
        aria-describedby={options.hint ? `${id}-hint` : undefined}
        aria-invalid={options.error ? true : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 aria-[invalid]:border-accent"
        id={id}
        onChange={(event) =>
          dispatch({
            type: SettingsActionType.Edit,
            data: { field: options.field, value: event.target.value },
          })
        }
        type={options.type ?? "text"}
        value={state.draft[options.field]}
      />
      {options.hint && !options.error && (
        <p className="text-xs text-muted" id={`${id}-hint`}>
          {options.hint}
        </p>
      )}
      {options.error && <p className="text-xs text-accent">{options.error}</p>}
    </div>
  );
}
