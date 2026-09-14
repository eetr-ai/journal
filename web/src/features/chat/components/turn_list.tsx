"use client";

import Markdown from "@/components/markdown";
import Moment from "./moment";
import ReasoningPanel from "./reasoning_panel";
import { useChat } from "../chat_state";
import { endsARun } from "../moments";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface TurnListOptions {
  t: Dictionary;
  locale: Locale;
  /** The reader's zone, from their profile. */
  timezone: string;
}

/**
 * Only what the person said is a bubble. The journal's own replies run the full
 * width of the column as prose, because they are the thing being read rather
 * than a turn in a conversation.
 *
 * A time appears under the last turn of a run rather than under every one:
 * three messages typed in the same half-minute do not each need the clock on
 * them, and stamping all of them pushes the words apart for nothing.
 */
export default function TurnList(options: TurnListOptions) {
  const { state } = useChat();
  const t = options.t.chat;
  // The turn being written is always the last one, and only while a run is in
  // flight — otherwise nothing is live and every panel is folded away.
  const streaming =
    state.status === "streaming" || state.status === "waiting" ? state.turns.at(-1)?.id : undefined;

  return (
    <>
      {state.turns.map((turn, at) =>
        turn.from === "you" ? (
          <div className="flex flex-col items-end gap-1" key={turn.id}>
            <div
              aria-label={t.you}
              className="max-w-lg rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-on-brand"
            >
              {turn.text}
            </div>
            {endsARun(turn.at, state.turns[at + 1], turn.from) ? (
              <Moment
                className="px-1 text-xs text-muted"
                fallbackLocale={options.locale}
                iso={turn.at}
                timezone={options.timezone}
              />
            ) : null}
          </div>
        ) : (
          <div aria-label={t.journal} className="text-sm" key={turn.id}>
            <ReasoningPanel live={turn.id === streaming} reasoning={turn.reasoning} t={options.t} />
            {turn.text === "" ? (
              <p className="text-muted">
                {turn.tools.started > turn.tools.finished ? t.working : t.thinking}
              </p>
            ) : (
              <>
                <Markdown>{turn.text}</Markdown>
                {endsARun(turn.at, state.turns[at + 1], turn.from) ? (
                  <Moment
                    className="mt-1 block text-xs text-muted"
                    fallbackLocale={options.locale}
                    iso={turn.at}
                    timezone={options.timezone}
                  />
                ) : null}
              </>
            )}
          </div>
        ),
      )}
    </>
  );
}
