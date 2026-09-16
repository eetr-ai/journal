"use client";

import { useSyncExternalStore } from "react";
import { conversationMoment, readerLocale, turnMoment, type MomentOptions } from "../moments";

export interface MomentOptionsProps extends Omit<MomentOptions, "locale"> {
  /** The app's language, which is all the server has to render with. */
  fallbackLocale: string;
  /** A conversation is always dated; a turn from today is not. */
  shape?: "turn" | "conversation";
  className?: string;
}

// The reader's locale never changes under us, so there is nothing to subscribe
// to — but useSyncExternalStore is still the right tool, because what it does
// besides subscribing is render the server's snapshot during hydration and the
// browser's on the render after.
const NEVER_CHANGES = () => () => {};

/**
 * A time the reader can read, in the locale their machine is set to.
 *
 * That locale cannot be used on the first render. The server does not have it,
 * and React does not patch mismatched text during hydration — it keeps what the
 * server sent — so a first client render that reached for `navigator` would
 * leave the app-language rendering on screen for good.
 */
export default function Moment(options: MomentOptionsProps) {
  const locale = useSyncExternalStore(
    NEVER_CHANGES,
    () => readerLocale(options.fallbackLocale),
    () => options.fallbackLocale,
  );

  const moment = { iso: options.iso, timezone: options.timezone, locale };
  const shown = options.shape === "conversation" ? conversationMoment(moment) : turnMoment(moment);

  return (
    <time className={options.className} dateTime={options.iso}>
      {shown}
    </time>
  );
}
