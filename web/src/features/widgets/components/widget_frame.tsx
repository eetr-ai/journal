"use client";

import type { ReactNode } from "react";

export const WIDGET_BUTTON =
  "tap-target rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted disabled:cursor-default disabled:opacity-70";

export interface WidgetFrameOptions {
  /** What kind of card this is, and anything said about it after a dot. */
  label: ReactNode;
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
      <p className="text-xs text-muted">{options.label}</p>
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
