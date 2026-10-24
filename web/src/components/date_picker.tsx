"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react";
import DatePickerPanel from "./date_picker_panel";
import { dateIn } from "./dates";
import { useDismiss } from "./use_dismiss";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface DatePickerOptions {
  id: string;
  /** YYYY-MM-DD, MM-DD when the year is not known, or empty. */
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  labels: Dictionary["datePicker"];
  /** Offers "I don't know the year", which stores MM-DD. */
  allowNoYear?: boolean;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

/**
 * A date in the reader's language rather than the browser's, picked from a
 * month that jumps by month and year — a birthday is decades back, not a few
 * clicks. The field shows the date; the panel below it picks one.
 */
export default function DatePicker(options: DatePickerOptions) {
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const labels = options.labels;
  const close = useCallback(() => setOpen(false), []);

  useDismiss(field, open, close);

  return (
    <div className="relative" ref={field}>
      <div className="flex items-center rounded-lg border border-border bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 has-[[data-invalid]]:border-accent">
        <button
          aria-describedby={options.describedBy}
          aria-expanded={open}
          data-invalid={options.invalid ? "" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-base outline-none disabled:opacity-60 md:text-sm"
          disabled={options.disabled}
          id={options.id}
          onClick={() => setOpen((was) => !was)}
          type="button"
        >
          <span className={`min-w-0 flex-1 truncate ${options.value ? "" : "text-muted"}`}>
            {options.value ? dateIn(options.value, options.locale) : labels.choose}
          </span>
          <CalendarBlankIcon className="shrink-0 text-muted" size={ICON_SIZE} />
        </button>
        {options.value && !options.disabled && (
          <button
            aria-label={labels.clear}
            className="tap-target mr-1 shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            onClick={() => options.onChange("")}
            title={labels.clear}
            type="button"
          >
            <XIcon size={ICON_SIZE} />
          </button>
        )}
      </div>
      {open && (
        <DatePickerPanel
          allowNoYear={options.allowNoYear ?? false}
          labels={labels}
          locale={options.locale}
          onPick={(value) => {
            options.onChange(value);
            close();
          }}
          onYearKnown={options.onChange}
          value={options.value}
        />
      )}
    </div>
  );
}
