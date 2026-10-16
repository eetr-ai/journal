"use client";

import AddButton from "./add_button";
import { startOf } from "../taps";
import WidgetFrame, { SourceLink } from "./widget_frame";
import type { Place, Widget } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface QuoteWidgetOptions {
  quote: Extract<Widget, { name: "quote" }>;
  t: Dictionary;
  /** In an entry the words are already kept, so there is nothing to add them to. */
  place?: Place;
}

/** A line worth keeping, who said it, and where. */
export default function QuoteWidget(options: QuoteWidgetOptions) {
  const { quote } = options;
  const t = options.t.widgets.quote;
  const adding = options.place !== "entry";

  return (
    <WidgetFrame
      actions={
        adding || quote.href !== "" ? (
          <>
            {adding ? (
              <AddButton
                label={t.add}
                sent={t.sent}
                tap={{
                  widget: "quote",
                  act: "add",
                  title: quote.source,
                  by: quote.by,
                  start: startOf(quote.text),
                }}
              />
            ) : null}
            <SourceLink href={quote.href}>{t.source}</SourceLink>
          </>
        ) : undefined
      }
      label={<span className="font-semibold text-brand-strong">{t.label}</span>}
    >
      <figure className="flex flex-col gap-2">
        <blockquote className="font-serif text-base leading-relaxed">“{quote.text}”</blockquote>
        <figcaption className="text-xs text-muted">
          {quote.by}
          {quote.source === "" ? null : <cite className="not-italic">{` · ${quote.source}`}</cite>}
        </figcaption>
      </figure>
    </WidgetFrame>
  );
}
