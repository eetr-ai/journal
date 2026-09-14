import { ChatsCircleIcon, NotebookIcon } from "@phosphor-icons/react/dist/ssr";
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
}

export default function LeftDrawer(options: LeftDrawerOptions) {
  const samples = sampleContent(options.locale);

  return (
    <aside className="flex w-64 shrink-0 flex-col divide-y divide-border border-r border-border bg-surface">
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3">
          <span className="text-muted">
            <ChatsCircleIcon size={ICON_SIZE} weight="fill" />
          </span>
          <h2 className="flex-1 text-sm font-semibold">{options.t.shell.transcripts}</h2>
          <a className="text-xs text-brand hover:underline" href={`/${options.locale}`}>
            {options.t.chat.newChat}
          </a>
        </header>
        <ConversationList
          conversations={options.conversations}
          current={options.current}
          locale={options.locale}
          t={options.t}
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
