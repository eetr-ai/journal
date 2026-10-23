"use client";

import { PROXIMITY_LEVELS } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface ProximityFieldOptions {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  t: Dictionary;
}

const NAME = "person-proximity";
const SEGMENT =
  "cursor-pointer rounded-md px-2.5 py-1.5 text-xs text-muted transition hover:text-foreground has-checked:bg-surface has-checked:font-medium has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-brand/30";

/** Closest first, then not set. Native radios, so arrow keys move between them. */
export default function ProximityField(options: ProximityFieldOptions) {
  const t = options.t.people;
  const choices = [
    ...PROXIMITY_LEVELS.map((level) => ({ value: level, label: t.proximityLevels[level] })),
    { value: "", label: t.proximityUnknown },
  ];
  const note = options.invalid ? `${NAME}-error` : `${NAME}-hint`;

  return (
    <fieldset aria-describedby={note} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t.proximity}</legend>
      <div className="flex flex-wrap gap-1 self-start rounded-lg border border-border bg-surface-muted p-1">
        {choices.map((choice) => (
          <label className={SEGMENT} key={choice.value}>
            <input
              checked={options.value === choice.value}
              className="sr-only"
              name={NAME}
              onChange={() => options.onChange(choice.value)}
              type="radio"
              value={choice.value}
            />
            {choice.label}
          </label>
        ))}
      </div>
      {options.invalid ? (
        <p className="text-xs text-accent" id={note}>
          {options.t.validation.notAllowed}
        </p>
      ) : (
        <p className="text-xs text-muted" id={note}>
          {t.proximityHint}
        </p>
      )}
    </fieldset>
  );
}
