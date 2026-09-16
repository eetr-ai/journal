import DetectPreferences from "@/features/profile/components/detect_preferences";
import VisibleViewport from "./visible_viewport";
import VaultGuard from "@/features/vault/components/vault_guard";
import ShellHeader from "./shell_header";
import ShellPanels from "./shell_panels";
import ShellProvider from "./shell_provider";
import EntriesProvider from "@/features/entries/components/entries_provider";
import SearchProvider from "@/features/entries/components/search_provider";
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

// The page never scrolls; each panel does. That is also why the shell is laid
// over the visible viewport rather than simply given a height: with nothing to
// scroll, a composer the keyboard covers has no way back on its own.
//
// The entries provider wraps the panels rather than the one that shows them,
// because the agent writes into the journal while it answers: the frames
// carrying that arrive in the conversation's stream, and the drawer has to hear
// them too.
export default function AppShell(options: AppShellOptions) {
  return (
    <ShellProvider>
      <div className="viewport-pinned flex flex-col">
        <VisibleViewport />
        <DetectPreferences needed={needsDetection(options.profile.config)} />
        <VaultGuard locale={options.locale} subject={options.profile.subject} />
        <SearchProvider>
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
            <ShellPanels
              conversations={options.conversations}
              locale={options.locale}
              subject={options.profile.subject}
              t={options.t}
              threadId={options.threadId}
              timezone={options.profile.config.timezone}
              todayWidth={options.profile.config.todayWidth}
              turns={options.turns}
              unavailable={options.unavailable}
            />
          </EntriesProvider>
        </SearchProvider>
      </div>
    </ShellProvider>
  );
}
