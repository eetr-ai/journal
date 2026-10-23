import ChatPanel from "@/features/chat/components/chat_panel";
import LeftDrawer from "./left_drawer";
import PanelRow from "./panel_row";
import PanelSheet from "./panel_sheet";
import SearchDialog from "@/features/entries/components/search_dialog";
import SearchResults from "@/features/entries/components/search_results";
import EntryPanel from "@/features/entries/components/entry_panel";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Conversation, Turn } from "@/features/chat/types";

export interface ShellPanelsOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
  timezone: string;
  threadId: string;
  turns: Turn[];
  conversations: Conversation[];
  unavailable: boolean;
  todayWidth: number;
}

/**
 * The drawer, the conversation, and the entry being written today.
 *
 * The conversation is the one that is always on screen; the other two are
 * columns beside it where there is room and covers over it where there is not.
 * Which of those it is, and which column has the middle, is decided entirely in
 * the stylesheet — the panels are rendered once and never move.
 */
export default function ShellPanels(options: ShellPanelsOptions) {
  return (
    <>
      <PanelRow
        chat={
          // Keyed by conversation: its reducer is seeded once, so another
          // conversation, or none, has to start over rather than inherit the turns.
          <ChatPanel
            key={options.threadId}
            locale={options.locale}
            subject={options.subject}
            t={options.t}
            threadId={options.threadId}
            timezone={options.timezone}
            turns={options.turns}
            unavailable={options.unavailable}
          />
        }
        drawer={
          <PanelSheet label={options.t.shell.dismiss} variant="drawer">
            <LeftDrawer
              conversations={options.conversations}
              current={options.threadId}
              locale={options.locale}
              subject={options.subject}
              t={options.t}
              timezone={options.timezone}
            />
          </PanelSheet>
        }
        entry={<EntryPanel locale={options.locale} subject={options.subject} t={options.t} />}
        over={<SearchResults locale={options.locale} t={options.t} />}
        t={options.t}
        width={options.todayWidth}
      />

      <SearchDialog locale={options.locale} subject={options.subject} t={options.t} />
    </>
  );
}
