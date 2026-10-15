"use client";

import { createContext } from "react";
import { useContextNullSafe } from "@eetr/react-reducer-utils";
import type { useChatStream } from "./use_chat_stream";

/**
 * The one way into this conversation, shared by everything that says something
 * in it: the composer, and the widgets in the replies.
 *
 * One instance per panel, because the stream hook is what knows whether a run
 * is going. A second instance would not, and would open a stream of its own
 * where it should have joined the one in flight.
 */
export type ChatSender = ReturnType<typeof useChatStream>;

export const ChatSenderContext = createContext<ChatSender | null>(null);

export function useChatSender(): ChatSender {
  return useContextNullSafe(ChatSenderContext);
}
