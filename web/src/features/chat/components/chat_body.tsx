"use client";

import ChatNotice from "./chat_notice";
import Composer from "./composer";
import TurnList from "./turn_list";
import { useChat } from "../chat_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface ChatBodyOptions {
  t: Dictionary;
  locale: Locale;
  unavailable: boolean;
  timezone: string;
}

export default function ChatBody(options: ChatBodyOptions) {
  const { state } = useChat();
  const t = options.t.chat;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <h2 className="flex-1 text-sm font-semibold">{t.title}</h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
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

      <div className="border-t border-border p-4">
        <Composer locale={options.locale} t={options.t} />
      </div>
    </section>
  );
}
