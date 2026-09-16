"use client";

import ChatNotice from "./chat_notice";
import Composer from "./composer";
import TurnList from "./turn_list";
import { useChat } from "../chat_state";
import { useStickToBottom } from "../use_stick_to_bottom";
import { useOpenedTurns } from "../use_opened_turns";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface ChatBodyOptions {
  t: Dictionary;
  locale: Locale;
  unavailable: boolean;
  timezone: string;
  subject: string;
}

export default function ChatBody(options: ChatBodyOptions) {
  const { state } = useChat();
  const t = options.t.chat;

  useOpenedTurns(options.subject, t.unreadable);
  // Everything that makes the region taller, as one number: a turn arriving, a
  // token landing, or a reasoning panel filling up.
  const written = state.turns.reduce(
    (total, turn) => total + turn.text.length + turn.reasoning.length,
    state.turns.length,
  );
  const { region, onScroll } = useStickToBottom(written);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background lg:min-w-80">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <h2 className="flex-1 text-sm font-semibold">{t.title}</h2>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-6"
        onScroll={onScroll}
        ref={region}
      >
        {state.turns.length === 0 ? (
          <div className="m-auto max-w-sm text-center">
            <p className="text-sm font-medium">
              {options.unavailable ? t.unavailableTitle : t.emptyTitle}
            </p>
            <p className="mt-1 text-sm text-muted">
              {options.unavailable ? t.unavailablePrompt : t.emptyPrompt}
            </p>
          </div>
        ) : (
          <TurnList locale={options.locale} t={options.t} timezone={options.timezone} />
        )}
      </div>

      <ChatNotice t={options.t} />

      {/* The bottom edge is where the home indicator sits, so the padding is
          whichever is larger: the layout's own, or enough to clear it. */}
      <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Composer locale={options.locale} subject={options.subject} t={options.t} />
      </div>
    </section>
  );
}
