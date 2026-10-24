"use client";

import type { ReactNode } from "react";

// Shape only. The two looks below each own their colours, hover included:
// Tailwind orders utilities by its own rules rather than by class order, so two
// hover backgrounds on one element leave which wins to chance.
const SHAPE =
  "tap-target rounded-full border px-3 py-1 text-xs disabled:cursor-default disabled:opacity-70";

export const WIDGET_BUTTON = `${SHAPE} border-border hover:bg-surface-muted disabled:hover:bg-transparent`;

/** The one thing a card is for. */
export const WIDGET_PRIMARY = `${SHAPE} border-brand bg-brand text-on-brand hover:border-brand-strong hover:bg-brand-strong disabled:hover:border-brand disabled:hover:bg-brand`;

export interface WidgetFrameOptions {
  /** What kind of card this is, and anything said about it after a dot. */
  label: ReactNode;
  /** A glyph before the label, for the cards that have one. */
  icon?: ReactNode;
  children: ReactNode;
  /** The buttons along the bottom, when the card has any. */
  actions?: ReactNode;
}

/**
 * The card every widget is drawn in.
 *
 * `not-prose` because it sits inside rendered markdown and is not markdown:
 * the reply's typography would otherwise restyle every line of it.
 */
export default function WidgetFrame(options: WidgetFrameOptions) {
  return (
    <article className="not-prose my-3 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {options.icon}
        <span className="min-w-0">{options.label}</span>
      </p>
      {options.children}
      {options.actions ? <div className="flex flex-wrap gap-2 pt-1">{options.actions}</div> : null}
    </article>
  );
}

/** A way out to where the words came from: a new tab, with no handle back here. */
export function SourceLink(options: { href: string; children: ReactNode }) {
  return options.href === "" ? null : (
    <a className={WIDGET_BUTTON} href={options.href} rel="noopener noreferrer" target="_blank">
      {options.children}
    </a>
  );
}
