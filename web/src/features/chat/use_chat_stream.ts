"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { openChat, steerChat } from "./browser_client";
import { readFrames } from "./stream_reader";
import { messageProblem } from "./rules";
import { useAgentKey } from "./use_agent_key";
import { ChatActionType, useChat, type ChatError } from "./chat_state";
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

/** Drains one run into the reducer. */
async function pump(body: ReadableStream<Uint8Array>, dispatch: Dispatcher): Promise<void> {
  for await (const frame of readFrames(body)) {
    const action = actionFor(frame);

    if (action) {
      dispatch(action);
    }
  }
}

/** Opens a run and drains it, reporting how it ended. */
async function run(ask: ChatAsk, signal: AbortSignal, dispatch: Dispatcher): Promise<void> {
  const body = await openChat({ ask, signal });

  if (!body) {
    dispatch({ type: ChatActionType.Failed, data: "unreachable" satisfies ChatError });

    return;
  }

  dispatch({ type: ChatActionType.Started });
  await pump(body, dispatch);
}

/** One whole run, from the first frame to whatever ended it. */
async function runToEnd(
  ask: ChatAsk,
  controller: AbortController,
  dispatch: Dispatcher,
): Promise<void> {
  try {
    await run(ask, controller.signal, dispatch);
    dispatch({ type: ChatActionType.Settled });
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
      if (running.current) {
        dispatch({ type: ChatActionType.FollowUp, data: message.trim() });
        await steerChat(ask(message.trim(), "say"));

        return;
      }

      dispatch({ type: ChatActionType.Sent, data: message.trim() });
      running.current = new AbortController();

      try {
        await runToEnd(ask(message.trim(), "say"), running.current, dispatch);
      } finally {
        running.current = null;
        // The conversation may be new, and the drawer beside this panel was
        // rendered before it existed.
        router.refresh();
      }
    },
    [agentKey, ask, dispatch, router],
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

    await steerChat(ask("", "stop"));
  }, [ask]);

  return { send, stop };
}
