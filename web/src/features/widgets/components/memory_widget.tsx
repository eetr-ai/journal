"use client";

import { useEntries } from "@/features/entries/entries_state";
import { useShowEntry } from "@/features/entries/use_show_entry";
import type { Entry } from "@/features/entries/types";
import { useHeldEntry } from "../use_held_entry";
import { agoText, dayText, excerptOf } from "../when";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface MemoryWidgetOptions {
  id: string;
  t: Dictionary;
  locale: Locale;
  /** The entry, when the caller already holds it. */
  known?: Entry;
  /** Offered only where there is another to give. */
  onAnother?: () => void;
}

const BUTTON =
  "tap-target rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted";

/**
 * A past entry as a card: when, what it was called, and how it began.
 *
 * `not-prose` because it sits inside rendered markdown and is not markdown:
 * the reply's typography would otherwise restyle every line of it.
 */
export default function MemoryWidget(options: MemoryWidgetOptions) {
  const held = useHeldEntry(options.id, options.known);
  const { state } = useEntries();
  const show = useShowEntry();
  const t = options.t.widgets.memory;

  if (held.missing) {
    return <p className="not-prose my-3 text-xs text-muted">{t.missing}</p>;
  }

  if (held.failed) {
    return <p className="not-prose my-3 text-xs text-accent">{t.failed}</p>;
  }

  const entry = held.entry;

  return (
    <article className="not-prose my-3 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">
        <span className="font-semibold text-brand-strong">{t.label}</span>
        {entry ? (
          <>
            {" · "}
            {agoText(entry.date, state.today, options.locale)}
            {" · "}
            <time dateTime={entry.date}>{dayText(entry.date, options.locale)}</time>
          </>
        ) : null}
      </p>

      {held.opened ? (
        <>
          <h3 className="font-serif text-base">{held.opened.title}</h3>
          <p className="font-serif text-sm leading-relaxed">{excerptOf(held.opened.content)}</p>
        </>
      ) : (
        <p className="shimmer-text text-sm">{t.opening}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {entry ? (
          <button className={BUTTON} onClick={() => show(entry)} type="button">
            {t.open}
          </button>
        ) : null}
        {options.onAnother ? (
          <button className={`${BUTTON} text-muted`} onClick={options.onAnother} type="button">
            {t.another}
          </button>
        ) : null}
      </div>
    </article>
  );
}
