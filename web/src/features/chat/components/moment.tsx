"use client";

import { conversationMoment, turnMoment, type MomentOptions } from "../moments";

export interface MomentOptionsProps extends MomentOptions {
  /** A conversation is always dated; a turn from today is not. */
  shape?: "turn" | "conversation";
  className?: string;
}

/**
 * A time the reader can read.
 *
 * `suppressHydrationWarning` because the server has no browser locale and no
 * reason to guess one: it renders in the app's language and the client corrects
 * it on hydration. The machine-readable value in `dateTime` is the same either
 * way, which is the one that has to agree.
 */
export default function Moment(options: MomentOptionsProps) {
  const shown =
    options.shape === "conversation" ? conversationMoment(options) : turnMoment(options);

  return (
    <time className={options.className} dateTime={options.iso} suppressHydrationWarning>
      {shown}
    </time>
  );
}
