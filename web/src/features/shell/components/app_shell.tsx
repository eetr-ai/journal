import ChatPanel from "@/features/chat/components/chat_panel";
import DetectPreferences from "@/features/profile/components/detect_preferences";
import VaultGuard from "@/features/vault/components/vault_guard";
import LeftDrawer from "./left_drawer";
import ShellHeader from "./shell_header";
import TodayPanel from "./today_panel";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import { needsDetection, type Profile } from "@/features/profile/types";
import type { Conversation, Turn } from "@/features/chat/types";

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
}

// Three vertical panels side by side: the drawer, the conversation, and the
// entry being written today. The page never scrolls; each panel does.
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
      <div className="flex min-h-0 flex-1">
        <LeftDrawer
          conversations={options.conversations}
          current={options.threadId}
          locale={options.locale}
          t={options.t}
        />
        <ChatPanel
          locale={options.locale}
          t={options.t}
          threadId={options.threadId}
          turns={options.turns}
          unavailable={options.unavailable}
        />
        <TodayPanel
          locale={options.locale}
          t={options.t}
          timezone={options.profile.config.timezone}
          width={options.profile.config.todayWidth}
        />
      </div>
    </div>
  );
}
