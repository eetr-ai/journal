"use client";

import type { PersonIssueCode } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface PersonFieldOptions {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  issue?: PersonIssueCode;
  multiline?: boolean;
  placeholder?: string;
  t: Dictionary;
}

const INPUT =
  "rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 md:text-sm aria-[invalid]:border-accent";
const NOTES_ROWS = 4;

function message(issue: PersonIssueCode | undefined, t: Dictionary): string | undefined {
  if (!issue) {
    return undefined;
  }

  return issue === "badBirthday" ? t.people.badBirthday : t.validation[issue];
}

/** One labelled field. Its error replaces its hint, so the two never disagree. */
export default function PersonField(options: PersonFieldOptions) {
  const error = message(options.issue, options.t);
  const describedBy = error ? `${options.id}-error` : options.hint && `${options.id}-hint`;
  const shared = {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
    className: INPUT,
    id: options.id,
    placeholder: options.placeholder,
    value: options.value,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={options.id}>
        {options.label}
      </label>
      {options.multiline ? (
        <textarea
          {...shared}
          onChange={(event) => options.onChange(event.target.value)}
          rows={NOTES_ROWS}
        />
      ) : (
        <input {...shared} onChange={(event) => options.onChange(event.target.value)} type="text" />
      )}
      {options.hint && !error && (
        <p className="text-xs text-muted" id={`${options.id}-hint`}>
          {options.hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-accent" id={`${options.id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
