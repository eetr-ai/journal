import ChatPanel from "./chat_panel";
import LeftDrawer from "./left_drawer";
import ShellHeader from "./shell_header";
import TodayPanel from "./today_panel";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Profile } from "@/features/profile/types";

export interface AppShellOptions {
  t: Dictionary;
  locale: Locale;
  profile: Profile;
  hasImage: boolean;
}

// Three vertical panels side by side: the drawer, the conversation, and the
// entry being written today. The page never scrolls; each panel does.
export default function AppShell(options: AppShellOptions) {
  return (
    <div className="flex h-screen flex-col">
      <ShellHeader
        email={options.profile.email}
        hasImage={options.hasImage}
        locale={options.locale}
        name={options.profile.name}
        t={options.t}
      />
      <div className="flex min-h-0 flex-1">
        <LeftDrawer locale={options.locale} t={options.t} />
        <ChatPanel locale={options.locale} t={options.t} />
        <TodayPanel
          locale={options.locale}
          t={options.t}
          width={options.profile.config.todayWidth}
        />
      </div>
    </div>
  );
}
