"use client";

import { BookmarkSimpleIcon, SunHorizonIcon, TrashIcon } from "@phosphor-icons/react";
import Markdown from "@/components/markdown";
import ConfirmDialog from "@/components/confirm_dialog";
import ResizablePanel from "@/features/shell/components/resizable_panel";
import { saveTodayWidthAction } from "@/features/profile/actions";
import { MAX_TODAY_WIDTH, MIN_TODAY_WIDTH } from "@/features/profile/types";
import { EntriesActionType, entryShowing, useEntries } from "../entries_state";
import { useOpenedEntries } from "../use_opened_entries";
import { useEntryUrl } from "../use_entry_url";
import { useThrowAway } from "../use_throw_away";
import { useKeeping } from "../use_keeping";
import { dayIn } from "../days";
import { isDraft, type Entry } from "../types";
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
  const { state } = useEntries();
  const going = useThrowAway();
  const keeping = useKeeping();

  useOpenedEntries(options.subject, options.t.entries.unreadable);
  useEntryUrl();

  const entry = entryShowing(state);
  const opened = entry ? state.opened[entry.id] : undefined;

  return (
    <ResizablePanel
      initialWidth={options.width}
      label={options.t.shell.resizeToday}
      max={MAX_TODAY_WIDTH}
      min={MIN_TODAY_WIDTH}
      onCommit={saveTodayWidthAction}
    >
      <aside className="flex min-h-0 flex-1 flex-col bg-surface">
        <PanelHeader
          entry={entry}
          locale={options.locale}
          onKeep={keeping.keep}
          onThrowAway={going.ask}
          t={options.t}
          title={opened?.title}
          today={state.today}
        />
        {going.failed && (
          <p className="border-b border-border px-4 py-2 text-xs text-accent">
            {options.t.entries.deleteFailed}
          </p>
        )}
        {keeping.failed && (
          <p className="border-b border-border px-4 py-2 text-xs text-accent">
            {options.t.entries.bookmarkFailed}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          <EntryBody
            body={opened?.content}
            empty={options.t.entries.empty}
            sealed={Boolean(entry)}
            started={options.t.entries.started}
            waiting={options.t.entries.opening}
          />
        </div>
      </aside>
      {going.asking && entry && (
        <ConfirmDialog
          body={options.t.entries.deleteConfirm.body}
          cancelLabel={options.t.entries.deleteConfirm.cancel}
          confirmLabel={options.t.entries.deleteConfirm.confirm}
          onCancel={going.cancel}
          onConfirm={() => going.confirm(entry)}
          title={options.t.entries.deleteConfirm.title}
        />
      )}
    </ResizablePanel>
  );
}

interface PanelHeaderOptions {
  t: Dictionary;
  locale: Locale;
  entry: Entry | null;
  /** The opened title, absent until the key has been through it. */
  title?: string;
  today: string;
  onThrowAway: () => void;
  onKeep: (entry: Entry) => void;
}

function PanelHeader(options: PanelHeaderOptions) {
  const { dispatch } = useEntries();
  const showingToday = !options.entry || options.entry.date === options.today;

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-3">
      <span className="text-highlight">
        <SunHorizonIcon size={ICON_SIZE} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">
          {showingToday ? options.t.shell.todayTitle : options.title || options.t.entries.untitled}
        </h2>
        <p className="text-xs text-muted">
          {dayIn(options.entry?.date ?? options.today, options.locale)}
        </p>
      </div>
      {/* Only when the panel has been moved off today. Getting back is the one
          thing a reader cannot do from the drawer, because today may have
          nothing in it to click. */}
      {showingToday ? null : (
        <button
          className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
          onClick={() => dispatch({ type: EntriesActionType.Closed })}
          type="button"
        >
          {options.t.entries.backToToday}
        </button>
      )}
      {options.entry && (
        <HeaderActions
          entry={options.entry}
          onKeep={options.onKeep}
          onThrowAway={options.onThrowAway}
          t={options.t}
        />
      )}
    </header>
  );
}

interface HeaderActionsOptions {
  t: Dictionary;
  entry: Entry;
  onThrowAway: () => void;
  onKeep: (entry: Entry) => void;
}

// What can be done to the entry on screen. Split out because a header that
// decides three things about four states is where this file stops reading.
function HeaderActions(options: HeaderActionsOptions) {
  const kept = options.entry.bookmarked;
  const keepLabel = kept ? options.t.entries.unbookmark : options.t.entries.bookmark;

  return (
    <>
      {/* Nothing to keep until something has been written into it: the row does
          not exist yet, and asking the agent to flag it would only 404. Throwing
          it away still works, and is how a draft is abandoned. */}
      {!isDraft(options.entry) && (
        <button
          aria-label={keepLabel}
          aria-pressed={kept}
          className={`shrink-0 rounded p-1 hover:bg-surface-muted ${
            kept ? "text-highlight" : "text-muted hover:text-foreground"
          }`}
          onClick={() => options.onKeep(options.entry)}
          title={keepLabel}
          type="button"
        >
          <BookmarkSimpleIcon size={ICON_SIZE} weight={kept ? "fill" : "regular"} />
        </button>
      )}
      <button
        aria-label={options.t.entries.delete}
        className="shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-accent"
        onClick={options.onThrowAway}
        title={options.t.entries.delete}
        type="button"
      >
        <TrashIcon size={ICON_SIZE} />
      </button>
    </>
  );
}

interface EntryBodyOptions {
  body?: string;
  empty: string;
  waiting: string;
  started: string;
  /** There is an entry; whether its words have arrived yet is the other flag. */
  sealed: boolean;
}

// Four states worth telling apart: no entry at all, an entry the reader started
// and has not filled in, one the key has not been through yet, and the thing
// itself.
function EntryBody(options: EntryBodyOptions) {
  if (!options.sealed) {
    return <p className="text-muted">{options.empty}</p>;
  }

  if (options.body === undefined) {
    return <p className="text-muted">{options.waiting}</p>;
  }

  if (options.body === "") {
    return <p className="text-muted">{options.started}</p>;
  }

  return <Markdown>{options.body}</Markdown>;
}
