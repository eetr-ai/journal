"use client";

import type { ReactNode } from "react";
import { ChatSenderContext } from "../chat_sender";
import { useChatStream } from "../use_chat_stream";
import type { Locale } from "@/i18n/config";

export interface ChatSenderProviderOptions {
  locale: Locale;
  subject: string;
  children: ReactNode;
}

export default function ChatSenderProvider(options: ChatSenderProviderOptions) {
  const sender = useChatStream({ locale: options.locale, subject: options.subject });

  return <ChatSenderContext value={sender}>{options.children}</ChatSenderContext>;
}
