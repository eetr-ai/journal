import { ChatsCircleIcon, NotePencilIcon, NotebookIcon } from "@phosphor-icons/react/dist/ssr";
import ConversationList from "@/features/chat/components/conversation_list";
import DrawerSection from "./drawer_section";
import { sampleContent } from "../mocks";
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
  const samples = sampleContent(options.locale);

  return (
    <aside className="flex w-64 shrink-0 flex-col divide-y divide-border border-r border-border bg-surface">
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3">
          <span className="shrink-0 text-muted">
            <ChatsCircleIcon size={ICON_SIZE} weight="fill" />
          </span>
          {/* Truncated rather than wrapped: the heading shares its line with the
              action beside it, and "Charlas recientes" is two words too many for
              a 16rem drawer. */}
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {options.t.shell.transcripts}
          </h2>
          {/* A compose icon, which is what every chat app uses for this now,
              rather than a second run of words competing with the heading. The
              name is still there for anyone not reading pixels. */}
          <a
            aria-label={options.t.chat.newChat}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            href={`/${options.locale}`}
            title={options.t.chat.newChat}
          >
            <NotePencilIcon size={ICON_SIZE} />
          </a>
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
      <DrawerSection
        icon={<NotebookIcon size={ICON_SIZE} weight="fill" />}
        items={samples.entries}
        mockedLabel={options.t.shell.mocked}
        title={options.t.shell.entries}
      />
    </aside>
  );
}
