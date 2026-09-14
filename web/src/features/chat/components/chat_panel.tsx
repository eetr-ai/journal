"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import ChatBody from "./chat_body";
import {
  ChatDispatchContext,
  ChatStateContext,
  chatReducer,
  initialChatState,
} from "../chat_state";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Turn } from "../types";

export interface ChatPanelOptions {
  t: Dictionary;
  locale: Locale;
  /** Minted on the server so the first render and the first send agree on it. */
  threadId: string;
  /** A conversation being re-opened, empty for a new one. */
  turns: Turn[];
  /** This conversation exists, but its turns could not be fetched. */
  unavailable: boolean;
  /** The reader's zone, from their profile. */
  timezone: string;
  /** Whose vault holds the key these turns are sealed under. */
  subject: string;
}

// SimpleProvider rather than bootstrapProvider: the initial state carries this
// conversation's id, which is per request, and bootstrapProvider fixes state at
// module scope.
export default function ChatPanel(options: ChatPanelOptions) {
  return (
    <SimpleProvider
      dispatchContext={ChatDispatchContext}
      initialState={initialChatState(options.threadId, options.turns)}
      reducer={chatReducer}
      stateContext={ChatStateContext}
    >
      <ChatBody
        locale={options.locale}
        subject={options.subject}
        t={options.t}
        timezone={options.timezone}
        unavailable={options.unavailable}
      />
    </SimpleProvider>
  );
}
