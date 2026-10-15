"use client";

import { useShowEntry } from "@/features/entries/use_show_entry";
import { useChatSender } from "@/features/chat/chat_sender";
import WidgetFrame from "./widget_frame";
import { useHeldEntry } from "../use_held_entry";
import { snippetOf } from "../when";
import type { Widget } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface SearchWidgetOptions {
  search: Extract<Widget, { name: "search" }>;
  t: Dictionary;
  locale: Locale;
}

const DAY = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } as const;

/**
 * Entries the journal found, by id. Each is fetched sealed and opened here like
 * any other, so a hit shows the reader's own words and never the agent's
 * account of them. One that is gone is left out rather than shown as a gap.
 */
export default function SearchWidget(options: SearchWidgetOptions) {
  const t = options.t.widgets.search;

  return (
    <WidgetFrame
      label={
        <>
          <span className="font-semibold text-brand-strong">{t.label}</span>
          {options.search.query === "" ? null : ` · «${options.search.query}»`}
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {options.search.ids.map((id) => (
          <Hit
            id={id}
            key={id}
            locale={options.locale}
            query={options.search.query}
            t={options.t}
          />
        ))}
      </ul>
    </WidgetFrame>
  );
}

interface HitOptions {
  id: string;
  query: string;
  t: Dictionary;
  locale: Locale;
}

function Hit(options: HitOptions) {
  const held = useHeldEntry(options.id);
  const show = useShowEntry();
  const { tap } = useChatSender();
  const entry = held.entry;

  if (held.missing || held.failed || !entry) {
    return null;
  }

  const snippet = held.opened ? snippetOf(held.opened.content, options.query) : null;
  const day = new Intl.DateTimeFormat(options.locale, DAY).format(Date.parse(entry.date));

  return (
    <li>
      <button
        className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-2 text-left hover:bg-surface-muted"
        onClick={() => {
          show(entry);
          void tap({ widget: "memory", act: "open", id: entry.id, date: entry.date });
        }}
        type="button"
      >
        <time className="pt-0.5 text-xs text-muted tabular-nums" dateTime={entry.date}>
          {day}
        </time>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">
            {held.opened?.title ?? options.t.widgets.memory.opening}
          </span>
          {snippet ? (
            <span className="text-xs text-muted">
              {snippet.before}
              {snippet.match === "" ? null : (
                <mark className="rounded-sm bg-highlight/35 px-0.5 text-foreground">
                  {snippet.match}
                </mark>
              )}
              {snippet.after}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
