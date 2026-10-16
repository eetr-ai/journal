"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Markdown from "@/components/markdown";
import InlinePicture from "@/features/images/components/inline_picture";
import PicturesBadge from "@/features/images/components/pictures_badge";
import PicturesDialog from "@/features/images/components/pictures_dialog";
import { IMAGE_SCHEME, anchoredId, anchoredIn } from "@/features/images/rules";
import { useEntryImages } from "@/features/images/use_entry_images";
import { useEntries } from "../entries_state";
import { changedRanges, type TextRange } from "../changes";
import { HIGHLIGHT_MS, useRevealChange } from "../use_reveal_change";
import { isDraft, type Entry, type OpenedEntry } from "../types";
import ChatWidget from "@/features/widgets/components/chat_widget";
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
}

// The old words stand in while the new ones are opened, and once they are, the
// blocks that differ are what gets marked.
function useWords(options: EntryContentOptions) {
  const after = options.opened?.content;
  const before = options.previous?.content;
  const changed = useMemo(
    () => (after === undefined || before === undefined ? null : changedRanges(before, after)),
    [after, before],
  );

  return { content: after ?? before, changed };
}

function usePicturesOf(entry: Entry | null, subject: string) {
  const { state } = useEntries();

  return useEntryImages({
    subject,
    entryId: entry && !isDraft(entry) ? entry.id : null,
    revision: entry ? (state.pictured[entry.id] ?? 0) : 0,
  });
}

// Cards an entry holds are drawn to be reread. Stable, because a new drawer
// remounts every card in the words.
function useDrawWidget(locale: Locale, t: Dictionary) {
  return useCallback(
    (encoded: string) => <ChatWidget encoded={encoded} locale={locale} place="entry" t={t} />,
    [locale, t],
  );
}

/**
 * The words, with the pictures their anchors place in them, and a badge for
 * every picture kept with the day. A draft has no row yet, so it has none.
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
  const { content, changed } = useWords(options);
  const drawWidget = useDrawWidget(options.locale, options.t);
  const box = useRef<HTMLDivElement>(null);
  useRevealChange(box, entry?.id ?? null, changed);
  const anchored = useMemo(() => anchoredIn(content ?? ""), [content]);
  const byId = useMemo(
    () => new Map(pictures.images.map((image) => [image.id, image])),
    [pictures.images],
  );

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm"
      ref={box}
      style={{ "--changed-ms": `${HIGHLIGHT_MS}ms` } as React.CSSProperties}
    >
      <PicturesBadge
        anchored={anchored}
        images={pictures.images}
        onOpen={() => setLooking(true)}
        status={pictures.status}
        t={options.t}
      />
      <EntryBody
        body={content}
        changed={changed ?? undefined}
        empty={options.t.entries.empty}
        renderImage={(url, alt) => (
          <InlinePicture
            alt={alt}
            image={byId.get(anchoredId(url) ?? "")}
            loading={pictures.status === "loading" || pictures.status === "idle"}
            t={options.t}
          />
        )}
        sealed={Boolean(entry)}
        widget={drawWidget}
        started={options.t.entries.started}
        waiting={options.t.entries.opening}
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

interface EntryBodyOptions {
  body?: string;
  changed?: TextRange[];
  empty: string;
  waiting: string;
  started: string;
  /** There is an entry; whether its words have arrived yet is the other flag. */
  sealed: boolean;
  renderImage: (url: string, alt: string) => React.ReactNode;
  widget: (encoded: string) => React.ReactNode;
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

  return (
    <Markdown
      changed={options.changed}
      place="entry"
      renderImage={options.renderImage}
      scheme={IMAGE_SCHEME}
      widget={options.widget}
    >
      {options.body}
    </Markdown>
  );
}
