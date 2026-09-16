"use client";

import { describedBy } from "./field_aria";
import { SettingsActionType, useSettings } from "../settings_state";
import type { ProfileDraft } from "../rules";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldOptions {
  field: keyof ProfileDraft;
  label: string;
  hint?: string;
  error?: string;
  options: readonly SelectOption[];
}

export default function SelectField(options: SelectFieldOptions) {
  const { state, dispatch } = useSettings();
  const id = `profile-${options.field}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {options.label}
      </label>
      <select
        aria-describedby={describedBy(id, options)}
        aria-invalid={options.error ? true : undefined}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 md:text-sm aria-[invalid]:border-accent"
        id={id}
        onChange={(event) =>
          dispatch({
            type: SettingsActionType.Edit,
            data: { field: options.field, value: event.target.value },
          })
        }
        value={state.draft[options.field]}
      >
        {options.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {options.hint && !options.error && (
        <p className="text-xs text-muted" id={`${id}-hint`}>
          {options.hint}
        </p>
      )}
      {options.error && (
        <p className="text-xs text-accent" id={`${id}-error`}>
          {options.error}
        </p>
      )}
    </div>
  );
}
