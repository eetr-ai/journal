"use client";

import { useMemo, useState } from "react";
import Markdown from "@/components/markdown";
import InlinePicture from "@/features/images/components/inline_picture";
import PicturesBadge from "@/features/images/components/pictures_badge";
import PicturesDialog from "@/features/images/components/pictures_dialog";
import { IMAGE_SCHEME, anchoredId, anchoredIn } from "@/features/images/rules";
import { useEntryImages } from "@/features/images/use_entry_images";
import { useEntries } from "../entries_state";
import { isDraft, type Entry, type OpenedEntry } from "../types";
import type { Dictionary } from "@/i18n/en";

export interface EntryContentOptions {
  t: Dictionary;
  subject: string;
  entry: Entry | null;
  /** What the key made of it, absent until it has been through. */
  opened?: OpenedEntry;
}

/**
 * The words, with the pictures their anchors place in them, and a badge for
 * every picture kept with the day. A draft has no row yet, so it has none.
 *
 * Which pictures are anchored is decided here, because this is the only side
 * that can read the words.
 */
export default function EntryContent(options: EntryContentOptions) {
  const { state } = useEntries();
  const entry = options.entry;
  const [looking, setLooking] = useState(false);
  const pictures = useEntryImages({
    subject: options.subject,
    entryId: entry && !isDraft(entry) ? entry.id : null,
    revision: entry ? (state.pictured[entry.id] ?? 0) : 0,
  });
  const content = options.opened?.content;
  const anchored = useMemo(() => anchoredIn(content ?? ""), [content]);
  const byId = useMemo(
    () => new Map(pictures.images.map((image) => [image.id, image])),
    [pictures.images],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
      <PicturesBadge
        anchored={anchored}
        images={pictures.images}
        onOpen={() => setLooking(true)}
        status={pictures.status}
        t={options.t}
      />
      <EntryBody
        body={content}
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
        started={options.t.entries.started}
        waiting={options.t.entries.opening}
      />
      {looking && entry ? (
        <PicturesDialog
          // Nothing is called loose until the words have been read.
          anchored={content === undefined ? null : anchored}
          entryId={entry.id}
          images={pictures.images}
          onClose={() => setLooking(false)}
          onRemoved={pictures.removed}
          t={options.t}
        />
      ) : null}
    </div>
  );
}

interface EntryBodyOptions {
  body?: string;
  empty: string;
  waiting: string;
  started: string;
  /** There is an entry; whether its words have arrived yet is the other flag. */
  sealed: boolean;
  renderImage: (url: string, alt: string) => React.ReactNode;
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
    <Markdown renderImage={options.renderImage} scheme={IMAGE_SCHEME}>
      {options.body}
    </Markdown>
  );
}
