"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { SearchActionType, useSearch } from "../search_state";
import { useEntries } from "../entries_state";
import { useShowEntry } from "../use_show_entry";
import { highlight } from "../highlight";
import { shortDayIn } from "../days";
import type { SearchHit } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface SearchResultsOptions {
  t: Dictionary;
  locale: Locale;
}

/**
 * What the journal answered, over the conversation rather than beside it.
 *
 * A cover, not a replacement: the conversation underneath is holding a stream
 * the agent may be writing into, and a list of days is not worth cutting that.
 */
export default function SearchResults(options: SearchResultsOptions) {
  const { state, dispatch } = useSearch();
  const t = options.t.entries.search;
  const showing = state.status !== "idle";

  return (
    <div className={`absolute inset-0 z-30 flex-col bg-background ${showing ? "flex" : "hidden"}`}>
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <button
          aria-label={t.close}
          className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          onClick={() => dispatch({ type: SearchActionType.Cleared })}
          type="button"
        >
          <ArrowLeftIcon size={ICON_SIZE} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{state.asked}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {state.status === "searching" && <p className="text-sm text-muted">{t.searching}</p>}
        {state.status === "failed" && <p className="text-sm text-accent">{t.failed}</p>}
        {state.status === "answered" && state.hits.length === 0 && (
          <p className="text-sm text-muted">{t.none}</p>
        )}

        <ul className="flex flex-col gap-2">
          {state.hits.map((hit) => (
            <Hit
              asked={state.asked}
              hit={hit}
              key={hit.entry.id}
              locale={options.locale}
              t={options.t}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface HitOptions {
  t: Dictionary;
  locale: Locale;
  hit: SearchHit;
  asked: string;
}

function Hit(options: HitOptions) {
  const { state } = useEntries();
  const show = useShowEntry();
  const title = state.opened[options.hit.entry.id]?.title ?? options.t.entries.opening;

  return (
    <li>
      <button
        aria-label={options.t.entries.open}
        className="w-full rounded-lg px-3 py-3 text-left hover:bg-surface-muted"
        onClick={() => show(options.hit.entry)}
        type="button"
      >
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{shortDayIn(options.hit.entry.date, options.locale)}</p>

        {/* The reader's own sentence, with what they asked for marked in it.
            Where the model kept the day without naming one, the line it wrote
            about the day is all there is to show. */}
        {options.hit.quote === "" ? (
          <p className="mt-1.5 text-sm text-muted italic">{options.hit.why}</p>
        ) : (
          <p className="mt-1.5 text-sm">
            {highlight(options.hit.quote, options.asked).map((piece, at) => (
              <span
                className={piece.marked ? "rounded bg-highlight/40 font-medium" : undefined}
                key={`${at}-${piece.text}`}
              >
                {piece.text}
              </span>
            ))}
          </p>
        )}
      </button>
    </li>
  );
}
