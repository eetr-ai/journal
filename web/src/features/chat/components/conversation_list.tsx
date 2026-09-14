"use client";

import { useRouter } from "next/navigation";
import { TrashIcon } from "@phosphor-icons/react";
import { forgetConversationAction } from "../actions";
import type { Conversation } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;

export interface ConversationListOptions {
  conversations: Conversation[];
  current: string | null;
  locale: Locale;
  t: Dictionary;
}

/**
 * Past conversations. Opening one is a navigation rather than client state, so
 * it survives a reload and can be linked to; the id is in the query because it
 * is a view of the same page, not a different one.
 */
export default function ConversationList(options: ConversationListOptions) {
  const router = useRouter();
  const t = options.t.chat;

  if (options.conversations.length === 0) {
    return <p className="px-4 py-2 text-xs text-muted">{t.noConversations}</p>;
  }

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {options.conversations.map((conversation) => (
        <li className="group flex items-center gap-1" key={conversation.id}>
          <a
            aria-current={conversation.id === options.current ? "page" : undefined}
            className="min-w-0 flex-1 rounded-lg px-2 py-2 hover:bg-surface-muted aria-[current]:bg-surface-muted"
            href={`/${options.locale}?chat=${encodeURIComponent(conversation.id)}`}
          >
            <p className="truncate text-sm">{conversation.title}</p>
          </a>
          <button
            aria-label={t.delete}
            className="shrink-0 px-2 text-muted opacity-0 group-hover:opacity-100"
            onClick={async () => {
              await forgetConversationAction(conversation.id);
              router.push(`/${options.locale}`);
            }}
            type="button"
          >
            <TrashIcon size={ICON_SIZE} />
          </button>
        </li>
      ))}
    </ul>
  );
}
