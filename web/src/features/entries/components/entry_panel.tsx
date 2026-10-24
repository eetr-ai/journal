"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkSimpleIcon, SunHorizonIcon, TrashIcon } from "@phosphor-icons/react";
import ConfirmDialog from "@/components/confirm_dialog";
import EntryContent from "./entry_content";
import PanelSheet from "@/features/shell/components/panel_sheet";
import { EntriesActionType, entryShowing, useEntries, type EntriesUiState } from "../entries_state";
import { useOpenedEntries } from "../use_opened_entries";
import { useEntryUrl } from "../use_entry_url";
import { useTodayDraft } from "../use_today_draft";
import { useThrowAway } from "../use_throw_away";
import { useKeeping } from "../use_keeping";
import { dayIn } from "../days";
import { format } from "@/i18n/format";
import { isDraft, type Entry } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface EntryPanelOptions {
  t: Dictionary;
  locale: Locale;
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
// The entry on screen and what the key has made of it so far. `standing` is
// what the header names it by: the current words, or older ones standing in.
function onScreen(state: EntriesUiState) {
  const entry = entryShowing(state);
  const opened = entry ? state.opened[entry.id] : undefined;
  const previous = entry ? state.previous[entry.id] : undefined;

  return { entry, opened, previous, standing: opened ?? previous };
}

export default function EntryPanel(options: EntryPanelOptions) {
  const { state } = useEntries();
  const going = useThrowAway();
  const keeping = useKeeping();

  useOpenedEntries(options.subject, options.t.entries.unreadable);
  useEntryUrl();
  useTodayDraft();

  // The header's slot for the editor's save button, which lives with the words.
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  const { entry, opened, previous, standing } = onScreen(state);

  return (
    <PanelSheet label={options.t.shell.dismiss} variant="entry">
      {/* min-w-0 because this is a flex item with no width of its own: the
          automatic minimum is the widest thing inside it, and a header that
          cannot shrink would otherwise carry the whole panel past the box
          holding it and off the side of a phone. */}
      <aside className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-surface">
        <PanelHeader
          entry={entry}
          locale={options.locale}
          onKeep={keeping.keep}
          onThrowAway={going.ask}
          t={options.t}
          icon={standing?.icon ?? ""}
          title={standing?.title}
          todayPage={state.showing === null}
          today={state.today}
          toolbar={setToolbar}
        />
        {going.failed && <Failure text={options.t.entries.deleteFailed} />}
        {keeping.failed && <Failure text={options.t.entries.bookmarkFailed} />}
        <EntryContent
          entry={entry}
          locale={options.locale}
          opened={opened}
          previous={previous}
          subject={options.subject}
          t={options.t}
          toolbar={toolbar}
        />
      </aside>
      {going.asking && entry && <ThrowAwayDialog entry={entry} going={going} t={options.t} />}
    </PanelSheet>
  );
}

interface ThrowAwayDialogOptions {
  t: Dictionary;
  entry: Entry;
  going: ReturnType<typeof useThrowAway>;
}

function ThrowAwayDialog(options: ThrowAwayDialogOptions) {
  const labels = options.t.entries.deleteConfirm;

  return (
    <ConfirmDialog
      body={labels.body}
      cancelLabel={labels.cancel}
      confirmLabel={labels.confirm}
      onCancel={options.going.cancel}
      onConfirm={() => options.going.confirm(options.entry)}
      title={labels.title}
    />
  );
}

interface ToolbarSlotOptions {
  onSlot: (element: HTMLElement | null) => void;
}

// Where the editor puts its save button, handed up once it is in the page.
function ToolbarSlot(params: ToolbarSlotOptions) {
  const own = useRef<HTMLSpanElement>(null);
  const report = params.onSlot;

  useEffect(() => {
    report(own.current);

    return () => report(null);
  }, [report]);

  return <span className="contents" ref={own} />;
}

function Failure(options: { text: string }) {
  return <p className="border-b border-border px-4 py-2 text-xs text-accent">{options.text}</p>;
}

interface PanelHeaderOptions {
  t: Dictionary;
  locale: Locale;
  entry: Entry | null;
  /** The opened title, absent until the key has been through it. */
  title?: string;
  /** The opened icon, which stands in for the sun once there is one. */
  icon: string;
  today: string;
  /** On today rather than on an entry picked by id. */
  todayPage: boolean;
  onThrowAway: () => void;
  onKeep: (entry: Entry) => void;
  toolbar: (element: HTMLElement | null) => void;
}

function PanelHeader(options: PanelHeaderOptions) {
  const { dispatch } = useEntries();
  const showingToday = !options.entry || options.entry.date === options.today;

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-3">
      {options.icon ? (
        <span aria-hidden className="text-base leading-none">
          {options.icon}
        </span>
      ) : (
        <span className="text-highlight">
          <SunHorizonIcon size={ICON_SIZE} weight="fill" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{headingOf(options, showingToday)}</h2>
        <p className="text-xs text-muted">{dayLineOf(options, showingToday)}</p>
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
      <ToolbarSlot onSlot={options.toolbar} />
      {hasActions(options) && options.entry && (
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

// A blank page has nothing to keep or throw away: it is not a row yet, and
// leaving it is all it takes to be rid of it.
function hasActions(options: PanelHeaderOptions): boolean {
  return options.entry !== null && !isDraft(options.entry);
}

// The entry's own title wins once it has one; "Today" only stands in for a
// title that has not been written or opened yet.
function headingOf(options: PanelHeaderOptions, showingToday: boolean): string {
  if (options.title) {
    return options.title;
  }

  return showingToday ? options.t.shell.todayTitle : options.t.entries.untitled;
}

function dayLineOf(options: PanelHeaderOptions, showingToday: boolean): string {
  const day = dayIn(options.entry?.date ?? options.today, options.locale);

  return showingToday ? format(options.t.shell.todayDate, { day }) : day;
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
          className={`tap-target shrink-0 rounded p-1 hover:bg-surface-muted ${
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
        className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-accent"
        onClick={options.onThrowAway}
        title={options.t.entries.delete}
        type="button"
      >
        <TrashIcon size={ICON_SIZE} />
      </button>
    </>
  );
}
