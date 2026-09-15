"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { openChat, steerChat } from "./browser_client";
import { readFrames } from "./stream_reader";
import { messageProblem } from "./rules";
import { useAgentKey } from "./use_agent_key";
import { ChatActionType, useChat, type ChatError } from "./chat_state";
import { EntriesActionType, useEntries } from "@/features/entries/entries_state";
import type { AgentFrame, ChatAsk } from "./types";
import type { Locale } from "@/i18n/config";

/**
 * Saying something, and stopping what is being said back.
 *
 * A message sent while a run is going does not start a second one: the agent
 * hands it to the run that holds this conversation, which answers in the stream
 * already open. So there is one stream per conversation, not one per message,
 * and the difference between the two paths is which of them the browser takes.
 */

export interface ChatStreamOptions {
  locale: Locale;
  subject: string;
}

const ABORTED = "AbortError";

/**
 * Frames that move the journal beside the conversation rather than the text in
 * it. They go to a different reducer, so they are picked off before the chat's
 * own mapping ever sees them.
 */
function panelAction(frame: AgentFrame): { type: EntriesActionType; data: unknown } | null {
  switch (frame.kind) {
    case "entry":
      return { type: EntriesActionType.Arrived, data: frame.entry };
    case "open":
      return { type: EntriesActionType.Shown, data: frame.entry };
    default:
      return null;
  }
}

function actionFor(frame: AgentFrame): { type: ChatActionType; data?: unknown } | null {
  switch (frame.kind) {
    case "text":
      return { type: ChatActionType.Delta, data: frame.text };
    case "reasoning":
      return { type: ChatActionType.Reasoning, data: frame.text };
    case "tool":
      return { type: ChatActionType.Tool, data: frame.done };
    case "answer":
      return { type: ChatActionType.Answered, data: frame.text };
    default:
      return null;
  }
}

/**
 * Why this message cannot be sent, or null.
 *
 * A missing key is one of the reasons: what the agent writes down is sealed
 * under it, so a message sent without one would be recorded in the clear.
 */
function refuse(message: string, agentKey: string | null): ChatError | null {
  return messageProblem(message) ?? (agentKey ? null : "locked");
}

type Dispatcher = (action: { type: ChatActionType; data?: unknown }) => void;
type PanelDispatcher = (action: { type: EntriesActionType; data?: unknown }) => void;

/** Drains one run into the two reducers it feeds. */
async function pump(
  body: ReadableStream<Uint8Array>,
  dispatch: Dispatcher,
  panel: PanelDispatcher,
): Promise<void> {
  for await (const frame of readFrames(body)) {
    const moved = panelAction(frame);

    if (moved) {
      panel(moved);

      continue;
    }

    const action = actionFor(frame);

    if (action) {
      dispatch(action);
    }
  }
}

/** Opens a run and drains it. False when it never opened. */
async function run(
  ask: ChatAsk,
  signal: AbortSignal,
  dispatch: Dispatcher,
  panel: PanelDispatcher,
): Promise<boolean> {
  const body = await openChat({ ask, signal });

  if (!body) {
    dispatch({
      type: ChatActionType.Failed,
      data: "unreachable" satisfies ChatError,
    });

    return false;
  }

  dispatch({ type: ChatActionType.Started });
  await pump(body, dispatch, panel);

  return true;
}

/** One whole run, from the first frame to whatever ended it. */
async function runToEnd(
  ask: ChatAsk,
  controller: AbortController,
  dispatch: Dispatcher,
  panel: PanelDispatcher,
): Promise<void> {
  try {
    // Settled only for a run that opened. It moves any status to idle, so
    // dispatching it after a failure would wipe the reason off the screen.
    if (await run(ask, controller.signal, dispatch, panel)) {
      dispatch({ type: ChatActionType.Settled });
    }
  } catch (error) {
    // Stopping deliberately is not a failure, and what streamed before it stays
    // on screen.
    dispatch(
      (error as Error)?.name === ABORTED
        ? { type: ChatActionType.Aborted }
        : { type: ChatActionType.Failed, data: "failed" satisfies ChatError },
    );
  }
}

export function useChatStream(options: ChatStreamOptions) {
  const { state, dispatch } = useChat();
  // The journal beside the conversation. The agent writes into it mid-run, so
  // the stream that carries the answer carries those frames too.
  const { dispatch: panel } = useEntries();
  const router = useRouter();
  const running = useRef<AbortController | null>(null);
  const agentKey = useAgentKey(options.subject);

  const ask = useCallback(
    (message: string, intent: ChatAsk["intent"]): ChatAsk => ({
      threadId: state.threadId,
      message,
      locale: options.locale,
      key: agentKey ?? "",
      intent,
    }),
    [agentKey, options.locale, state.threadId],
  );

  const send = useCallback(
    async (message: string): Promise<void> => {
      const problem = refuse(message, agentKey);

      if (problem) {
        dispatch({ type: ChatActionType.Failed, data: problem });

        return;
      }

      // A run already holds this conversation, so this joins it. The answer
      // keeps arriving where it already was.
      //
      // Shown only once it has landed: a follow-up the BFF refused never
      // reached the conversation, and leaving it on screen would say it had.
      if (running.current) {
        const joined = await steerChat(ask(message.trim(), "say"));

        dispatch(
          joined
            ? { type: ChatActionType.FollowUp, data: message.trim() }
            : {
                type: ChatActionType.Failed,
                data: "failed" satisfies ChatError,
              },
        );

        return;
      }

      dispatch({ type: ChatActionType.Sent, data: message.trim() });
      running.current = new AbortController();

      try {
        await runToEnd(ask(message.trim(), "say"), running.current, dispatch, panel);
      } finally {
        running.current = null;
        // The conversation may be new, and the drawer beside this panel was
        // rendered before it existed.
        router.refresh();
      }
    },
    [agentKey, ask, dispatch, panel, router],
  );

  /**
   * Ends the run rather than hanging up on it: cancelling the stream would stop
   * the agent too, but it would also lose whatever was mid-sentence. A stop
   * that finds nothing running is a no-op, so it is safe to send blind.
   */
  const stop = useCallback(async (): Promise<void> => {
    if (!running.current) {
      return;
    }

    // A stop that did not arrive leaves the run going, and the panel has to say
    // so rather than showing a button that did nothing.
    if (!(await steerChat(ask("", "stop")))) {
      dispatch({
        type: ChatActionType.Failed,
        data: "failed" satisfies ChatError,
      });
    }
  }, [ask, dispatch]);

  return { send, stop };
}
