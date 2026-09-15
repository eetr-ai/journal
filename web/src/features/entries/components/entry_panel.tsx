"use client";

import { SunHorizonIcon } from "@phosphor-icons/react/dist/ssr";
import Markdown from "@/components/markdown";
import ResizablePanel from "@/features/shell/components/resizable_panel";
import { saveTodayWidthAction } from "@/features/profile/actions";
import { MAX_TODAY_WIDTH, MIN_TODAY_WIDTH } from "@/features/profile/types";
import { EntriesActionType, entryShowing, useEntries } from "../entries_state";
import { useOpenedEntries } from "../use_opened_entries";
import { useEntryUrl } from "../use_entry_url";
import { dayIn } from "../days";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface EntryPanelOptions {
  t: Dictionary;
  locale: Locale;
  width: number;
  /** Whose vault holds the key these entries are sealed under. */
  subject: string;
}

/**
 * The journal, beside the conversation that is writing it.
 *
 * A client component because the agent writes into this while a person is
 * reading it: the entry on screen is whatever the last frame said it was, not
 * what the page was rendered with.
 */
export default function EntryPanel(options: EntryPanelOptions) {
  const { state, dispatch } = useEntries();

  useOpenedEntries(options.subject, options.t.entries.unreadable);
  useEntryUrl();

  const entry = entryShowing(state);
  const opened = entry ? state.opened[entry.id] : undefined;
  const showingToday = !entry || entry.date === state.today;

  return (
    <ResizablePanel
      initialWidth={options.width}
      label={options.t.shell.resizeToday}
      max={MAX_TODAY_WIDTH}
      min={MIN_TODAY_WIDTH}
      onCommit={saveTodayWidthAction}
    >
      <aside className="flex min-h-0 flex-1 flex-col bg-surface">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-highlight">
            <SunHorizonIcon size={ICON_SIZE} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">
              {showingToday
                ? options.t.shell.todayTitle
                : (opened?.title ?? options.t.entries.opening)}
            </h2>
            <p className="text-xs text-muted">
              {dayIn(entry?.date ?? state.today, options.locale)}
            </p>
          </div>
          {/* Only when the panel has been moved off today. Getting back is the
              one thing a reader cannot do from the drawer, because today may
              have nothing in it to click. */}
          {showingToday ? null : (
            <button
              className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
              onClick={() => dispatch({ type: EntriesActionType.Closed })}
              type="button"
            >
              {options.t.entries.backToToday}
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          <EntryBody
            body={opened?.content}
            empty={options.t.entries.empty}
            waiting={options.t.entries.opening}
            sealed={Boolean(entry)}
          />
        </div>
      </aside>
    </ResizablePanel>
  );
}

interface EntryBodyOptions {
  body?: string;
  empty: string;
  waiting: string;
  /** There is an entry; whether its words have arrived yet is the other flag. */
  sealed: boolean;
}

// Three states worth telling apart: nothing written yet, something written that
// the key has not been through, and the thing itself.
function EntryBody(options: EntryBodyOptions) {
  if (!options.sealed) {
    return <p className="text-muted">{options.empty}</p>;
  }

  if (options.body === undefined) {
    return <p className="text-muted">{options.waiting}</p>;
  }

  return <Markdown>{options.body}</Markdown>;
}
