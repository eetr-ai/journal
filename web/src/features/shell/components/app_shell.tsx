import ChatPanel from "@/features/chat/components/chat_panel";
import DetectPreferences from "@/features/profile/components/detect_preferences";
import VaultGuard from "@/features/vault/components/vault_guard";
import LeftDrawer from "./left_drawer";
import ShellHeader from "./shell_header";
import EntriesProvider from "@/features/entries/components/entries_provider";
import EntryPanel from "@/features/entries/components/entry_panel";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import { needsDetection, type Profile } from "@/features/profile/types";
import type { Conversation, Turn } from "@/features/chat/types";
import type { JournalView } from "@/features/entries/service";

export interface AppShellOptions {
  t: Dictionary;
  locale: Locale;
  profile: Profile;
  hasImage: boolean;
  /** This visit's conversation: a stored one being re-opened, or a new id. */
  threadId: string;
  turns: Turn[];
  conversations: Conversation[];
  unavailable: boolean;
  /** The journal beside the conversation: what is written, and what to show. */
  journal: JournalView;
}

// Three vertical panels side by side: the drawer, the conversation, and the
// entry being written today. The page never scrolls; each panel does.
//
// The entries provider wraps all three rather than the panel that shows them,
// because the agent writes into the journal while it answers: the frames
// carrying that arrive in the middle panel's stream, and the drawer has to hear
// them too.
export default function AppShell(options: AppShellOptions) {
  return (
    <div className="flex h-screen flex-col">
      <DetectPreferences needed={needsDetection(options.profile.config)} />
      <VaultGuard locale={options.locale} subject={options.profile.subject} />
      <ShellHeader
        email={options.profile.email}
        hasImage={options.hasImage}
        locale={options.locale}
        name={options.profile.name}
        t={options.t}
      />
      <EntriesProvider
        days={options.journal.days}
        entries={options.journal.entries}
        showing={options.journal.showing}
        today={options.journal.today}
      >
        <div className="flex min-h-0 flex-1">
          <LeftDrawer
            conversations={options.conversations}
            current={options.threadId}
            locale={options.locale}
            subject={options.profile.subject}
            t={options.t}
            timezone={options.profile.config.timezone}
          />
          <ChatPanel
            locale={options.locale}
            subject={options.profile.subject}
            t={options.t}
            threadId={options.threadId}
            timezone={options.profile.config.timezone}
            turns={options.turns}
            unavailable={options.unavailable}
          />
          <EntryPanel
            locale={options.locale}
            subject={options.profile.subject}
            t={options.t}
            width={options.profile.config.todayWidth}
          />
        </div>
      </EntriesProvider>
    </div>
  );
}
