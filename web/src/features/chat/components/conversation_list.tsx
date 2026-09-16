"use client";

import Moment from "./moment";
import { useOpenedTitles } from "../use_opened_titles";
import type { Conversation } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface ConversationListOptions {
  conversations: Conversation[];
  current: string | null;
  locale: Locale;
  timezone: string;
  subject: string;
  t: Dictionary;
}

/**
 * Past conversations. Opening one is a navigation rather than client state, so
 * it survives a reload and can be linked to; the id is in the query because it
 * is a view of the same page, not a different one.
 */
export default function ConversationList(options: ConversationListOptions) {
  const t = options.t.chat;
  // A title is written by the agent about what was said, so it is sealed with
  // everything else and opened here rather than on the server.
  const titles = useOpenedTitles(options.conversations, options.subject, t.unreadable);

  if (options.conversations.length === 0) {
    return <p className="px-4 py-2 text-xs text-muted">{t.noConversations}</p>;
  }

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {options.conversations.map((conversation) => (
        <li key={conversation.id}>
          <a
            aria-current={conversation.id === options.current ? "page" : undefined}
            className="block rounded-lg px-2 py-2 hover:bg-surface-muted aria-[current]:bg-surface-muted"
            href={`/${options.locale}?chat=${encodeURIComponent(conversation.id)}`}
          >
            <p className="truncate text-sm">{titles[conversation.id] ?? ""}</p>
            <Moment
              className="text-xs text-muted"
              fallbackLocale={options.locale}
              iso={conversation.lastActivityAt}
              shape="conversation"
              timezone={options.timezone}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
