import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr";
import ConversationList from "@/features/chat/components/conversation_list";
import EntryList from "@/features/entries/components/entry_list";
import type { Conversation } from "@/features/chat/types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface LeftDrawerOptions {
  t: Dictionary;
  locale: Locale;
  conversations: Conversation[];
  current: string;
  timezone: string;
  subject: string;
}

export default function LeftDrawer(options: LeftDrawerOptions) {
  // min-w-0 because this is a flex item with no width of its own: the automatic
  // minimum is the widest thing inside it, and one long title would otherwise
  // push the panel past the box holding it and paint over the conversation.
  return (
    <aside className="flex min-h-0 w-full min-w-0 flex-1 flex-col divide-y divide-border border-r border-border bg-surface">
      {/* The journal first: it is what the drawer is for, and the chats that
          wrote it come second. */}
      <EntryList locale={options.locale} subject={options.subject} t={options.t} />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3">
          <span className="shrink-0 text-muted">
            <ChatsCircleIcon size={ICON_SIZE} weight="fill" />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {options.t.shell.transcripts}
          </h2>
        </header>
        <ConversationList
          conversations={options.conversations}
          current={options.current}
          locale={options.locale}
          subject={options.subject}
          t={options.t}
          timezone={options.timezone}
        />
      </section>
    </aside>
  );
}
