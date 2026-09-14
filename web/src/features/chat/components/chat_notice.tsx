"use client";

import { useChat } from "../chat_state";
import type { Dictionary } from "@/i18n/en";

export interface ChatNoticeOptions {
  t: Dictionary;
}

/**
 * What went wrong, or that the person stopped it themselves. Both are ordinary
 * ends to a run and neither takes what streamed off the screen.
 */
export default function ChatNotice(options: ChatNoticeOptions) {
  const { state } = useChat();
  const t = options.t.chat;

  if (state.status === "aborted") {
    return <p className="px-5 pb-2 text-xs text-muted">{t.aborted}</p>;
  }

  if (!state.error) {
    return null;
  }

  return <output className="block px-5 pb-2 text-xs text-accent">{t.errors[state.error]}</output>;
}
