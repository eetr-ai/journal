"use client";

import Markdown from "@/components/markdown";
import { useChat } from "../chat_state";
import type { Dictionary } from "@/i18n/en";

export interface TurnListOptions {
  t: Dictionary;
}

/**
 * Only what the person said is a bubble. The journal's own replies run the full
 * width of the column as prose, because they are the thing being read rather
 * than a turn in a conversation.
 */
export default function TurnList(options: TurnListOptions) {
  const { state } = useChat();
  const t = options.t.chat;

  return (
    <>
      {state.turns.map((turn) =>
        turn.from === "you" ? (
          <div
            aria-label={t.you}
            className="max-w-lg self-end rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-on-brand"
            key={turn.id}
          >
            {turn.text}
          </div>
        ) : (
          <div aria-label={t.journal} className="text-sm" key={turn.id}>
            {turn.text === "" ? (
              <p className="text-muted">
                {turn.tools.started > turn.tools.finished ? t.working : t.thinking}
              </p>
            ) : (
              <Markdown>{turn.text}</Markdown>
            )}
          </div>
        ),
      )}
    </>
  );
}
