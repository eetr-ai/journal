"use client";

import { useCallback, useMemo, useState } from "react";
import EntryEditor from "@/features/editor/components/entry_editor";
import PicturesBadge from "@/features/images/components/pictures_badge";
import PicturesDialog from "@/features/images/components/pictures_dialog";
import { anchoredIn } from "@/features/images/rules";
import { useEntryImages } from "@/features/images/use_entry_images";
import { useEntries } from "../entries_state";
import { HIGHLIGHT_MS, useChangeTimeout } from "../use_change_timeout";
import { isDraft, type Entry, type OpenedEntry } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface EntryContentOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  entry: Entry | null;
  /** What the key made of it, absent until it has been through. */
  opened?: OpenedEntry;
  /** What it said before the agent's last write, until that change is shown. */
  previous?: OpenedEntry;
  /** Where the editor puts its save button, in the panel's top bar. */
  toolbar: HTMLElement | null;
}

// The old words stand in while the new ones are opened, and once they are, they
// are what the change is measured from.
function useWords(options: EntryContentOptions) {
  const after = options.opened?.content;
  const before = options.previous?.content;

  return { content: after ?? before, changedFrom: after === undefined ? undefined : before };
}

function usePicturesOf(entry: Entry | null, subject: string) {
  const { state } = useEntries();

  return useEntryImages({
    subject,
    entryId: entry && !isDraft(entry) ? entry.id : null,
    revision: entry ? (state.pictured[entry.id] ?? 0) : 0,
  });
}

/**
 * The words, written in place, with the pictures their anchors place in them,
 * and a badge for every picture kept with the day. A draft has no row yet, so
 * it has none.
 *
 * Which pictures are anchored is decided here, because this is the only side
 * that can read the words.
 */
export default function EntryContent(options: EntryContentOptions) {
  const entry = options.entry;
  const [looking, setLooking] = useState(false);
  // Stable, because the dialog reopens whenever its close handler changes, and
  // this re-renders on every frame the conversation streams in.
  const stopLooking = useCallback(() => setLooking(false), []);
  const pictures = usePicturesOf(entry, options.subject);
  const { content, changedFrom } = useWords(options);
  useChangeTimeout({
    entryId: entry?.id ?? null,
    version: entry?.version ?? 0,
    pending: changedFrom !== undefined,
  });
  const anchored = useMemo(() => anchoredIn(content ?? ""), [content]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm"
      style={{ "--changed-ms": `${HIGHLIGHT_MS}ms` } as React.CSSProperties}
    >
      <PicturesBadge
        anchored={anchored}
        images={pictures.images}
        onOpen={() => setLooking(true)}
        status={pictures.status}
        t={options.t}
      />
      <EntryWords
        changedFrom={changedFrom}
        content={content}
        options={options}
        pictures={pictures}
      />
      {looking && entry ? (
        <PicturesDialog
          // Nothing is called loose until the words have been read.
          anchored={content === undefined ? null : anchored}
          entryId={entry.id}
          images={pictures.images}
          onClose={stopLooking}
          onRemoved={pictures.removed}
          t={options.t}
        />
      ) : null}
    </div>
  );
}

interface EntryWordsOptions {
  options: EntryContentOptions;
  /** What the entry says, or undefined until the key has been through it. */
  content?: string;
  changedFrom?: string;
  pictures: ReturnType<typeof usePicturesOf>;
}

// No entry, an entry still sealed, and the words themselves, written in place.
function EntryWords(params: EntryWordsOptions) {
  const { options, content, changedFrom, pictures } = params;
  const entry = options.entry;

  if (!entry || content === undefined) {
    return (
      <p className="text-muted">{entry ? options.t.entries.opening : options.t.entries.empty}</p>
    );
  }

  return (
    <EntryEditor
      changedFrom={changedFrom}
      current={options.opened !== undefined}
      entry={entry}
      key={entry.id}
      locale={options.locale}
      onPictureAdded={pictures.added}
      opened={options.opened}
      pictures={pictures.images}
      picturesLoading={pictures.status === "loading" || pictures.status === "idle"}
      subject={options.subject}
      t={options.t}
      toolbar={options.toolbar}
      words={{ title: options.opened?.title ?? options.previous?.title ?? "", content }}
    />
  );
}
