"use client";

import AddButton from "./add_button";
import { startOf } from "../taps";
import WidgetFrame, { SourceLink } from "./widget_frame";
import type { Place, Widget } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface LyricsWidgetOptions {
  lyrics: Extract<Widget, { name: "lyrics" }>;
  t: Dictionary;
  /** In an entry the words are already kept, so there is nothing to add them to. */
  place?: Place;
}

/**
 * A few lines of a song, line by line as they are sung. Held to a verse: past
 * that it is the song, and the link is where the song is.
 */
export default function LyricsWidget(options: LyricsWidgetOptions) {
  const { lyrics } = options;
  const t = options.t.widgets.lyrics;
  const adding = options.place !== "entry";

  return (
    <WidgetFrame
      actions={
        adding || lyrics.href !== "" ? (
          <>
            {adding ? (
              <AddButton
                label={t.add}
                sent={t.sent}
                tap={{
                  widget: "lyrics",
                  act: "add",
                  title: lyrics.title,
                  by: lyrics.by,
                  start: startOf(lyrics.lines.join(" ")),
                }}
              />
            ) : null}
            <SourceLink href={lyrics.href}>{t.source}</SourceLink>
          </>
        ) : undefined
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
