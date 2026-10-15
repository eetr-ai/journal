"use client";

import AddButton from "./add_button";
import WidgetFrame, { SourceLink } from "./widget_frame";
import type { Widget } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface LyricsWidgetOptions {
  lyrics: Extract<Widget, { name: "lyrics" }>;
  t: Dictionary;
}

/**
 * A few lines of a song, line by line as they are sung. Held to a verse: past
 * that it is the song, and the link is where the song is.
 */
export default function LyricsWidget(options: LyricsWidgetOptions) {
  const { lyrics } = options;
  const t = options.t.widgets.lyrics;

  return (
    <WidgetFrame
      actions={
        <>
          <AddButton
            label={t.add}
            sent={t.sent}
            tap={{ widget: "lyrics", act: "add", title: lyrics.title, by: lyrics.by }}
          />
          <SourceLink href={lyrics.href}>{t.source}</SourceLink>
        </>
      }
      label={
        <>
          <span className="font-semibold text-brand-strong">{t.label}</span>
          {` · ${lyrics.by}`}
        </>
      }
    >
      <h3 className="font-serif text-base">{lyrics.title}</h3>
      <p className="font-serif text-sm whitespace-pre-line italic leading-relaxed">
        {lyrics.lines.join("\n")}
        {lyrics.cut ? "\n…" : ""}
      </p>
    </WidgetFrame>
  );
}
