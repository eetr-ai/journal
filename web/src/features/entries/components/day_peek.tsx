"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CakeIcon, NotebookIcon } from "@phosphor-icons/react";
import { useEntries } from "../entries_state";
import { dayIn } from "../days";
import { isDraft } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 12;
// Room kept between the card and the day, and between the card and the window.
const GAP_PX = 4;
const MARGIN_PX = 8;
const HALF = 2;

export interface DayPeekOptions {
  date: string;
  /** The day it is about, which the card is placed against. */
  anchor: RefObject<HTMLElement | null>;
  /** Whose birthday it is, by name. */
  birthdays: string[];
  written: boolean;
  locale: Locale;
  t: Dictionary;
}

/**
 * Where the card goes: centred under the day, slid sideways to stay inside the
 * window, and above the day when there is no room below. Rendered into the
 * body, so nothing around the calendar can clip it.
 */
function placed(anchor: DOMRect, card: DOMRect): CSSProperties {
  const centred = anchor.left + anchor.width / HALF - card.width / HALF;
  const left = Math.min(Math.max(centred, MARGIN_PX), window.innerWidth - card.width - MARGIN_PX);
  const below = anchor.bottom + GAP_PX;
  const fits = below + card.height <= window.innerHeight - MARGIN_PX;

  return { left, top: fits ? below : anchor.top - GAP_PX - card.height };
}

// Measured before paint, so the card never shows in the wrong place first.
function usePlacement(anchor: RefObject<HTMLElement | null>) {
  const card = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (anchor.current && card.current) {
      setStyle(
        placed(anchor.current.getBoundingClientRect(), card.current.getBoundingClientRect()),
      );
    }
  }, [anchor]);

  return { card, style };
}

/**
 * What a day holds, on a hover or a focus: whose birthday it is and what was
 * written. Only what the drawer already holds is named; an older day the list
 * does not reach is said to have something on it rather than fetched.
 */
export default function DayPeek(options: DayPeekOptions) {
  const { state } = useEntries();
  const t = options.t.entries.days;
  const held = state.entries.filter((entry) => entry.date === options.date && !isDraft(entry));
  const { card, style } = usePlacement(options.anchor);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 w-64 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-surface p-2.5 text-left shadow-lg"
      ref={card}
      role="tooltip"
      style={style}
    >
      <p className="pb-1.5 text-xs font-semibold first-letter:uppercase">
        {dayIn(options.date, options.locale)}
      </p>
      <ul className="flex flex-col gap-1 text-xs">
        {options.birthdays.map((name) => (
          <li className="flex items-start gap-1.5" key={name}>
            <CakeIcon className="mt-0.5 shrink-0 text-highlight" size={ICON_SIZE} weight="fill" />
            <span className="line-clamp-2">{name}</span>
          </li>
        ))}
        {held.map((entry) => {
          const opened = state.opened[entry.id];

          return (
            <li className="flex items-start gap-1.5" key={entry.id}>
              {opened?.icon ? (
                <span className="shrink-0">{opened.icon}</span>
              ) : (
                <NotebookIcon className="mt-0.5 shrink-0 text-muted" size={ICON_SIZE} />
              )}
              <span className="line-clamp-2">{opened?.title || options.t.entries.untitled}</span>
            </li>
          );
        })}
        {options.written && held.length === 0 && <li className="text-muted">{t.written}</li>}
      </ul>
    </div>,
    document.body,
  );
}
