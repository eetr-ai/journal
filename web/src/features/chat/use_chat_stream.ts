"use client";

import { useCallback, useRef } from "react";
import { openChat } from "./browser_client";
import { readFrames } from "./stream_reader";
import { messageProblem } from "./rules";
import { ChatActionType, useChat, type ChatError } from "./chat_state";
import type { AgentFrame } from "./types";
import type { Locale } from "@/i18n/config";

/**
 * Sending a message, and stopping one part-way.
 *
 * Stopping cancels the fetch, which cancels the stream, which is what the agent
 * reads as "nobody is listening" — so a person who closes this is not left
 * paying for a run nobody will read.
 */

export interface ChatStreamOptions {
  locale: Locale;
}

const ABORTED = "AbortError";

function actionFor(frame: AgentFrame): { type: ChatActionType; data?: unknown } | null {
  switch (frame.kind) {
    case "text":
      return { type: ChatActionType.Delta, data: frame.text };
    case "tool":
      return { type: ChatActionType.Tool, data: frame.done };
    case "answer":
      return { type: ChatActionType.Answered, data: frame.text };
    default:
      return null;
  }
}

/**
 * Opens a run and drains it into the reducer, reporting how it ended. Module
 * level, so the hook stays about the one thing React needs from it.
 */
async function run(
  ask: { threadId: string; message: string; locale: Locale },
  signal: AbortSignal,
  dispatch: (action: { type: ChatActionType; data?: unknown }) => void,
): Promise<void> {
  const body = await openChat({ ask, signal });

  if (!body) {
    dispatch({ type: ChatActionType.Failed, data: "unreachable" satisfies ChatError });

    return;
  }

  dispatch({ type: ChatActionType.Started });
  await pump(body, dispatch);
}

/** Drains one run into the reducer. */
async function pump(
  body: ReadableStream<Uint8Array>,
  dispatch: (action: { type: ChatActionType; data?: unknown }) => void,
): Promise<void> {
  for await (const frame of readFrames(body)) {
    const action = actionFor(frame);

    if (action) {
      dispatch(action);
    }
  }
}

export function useChatStream(options: ChatStreamOptions) {
  const { state, dispatch } = useChat();
  const running = useRef<AbortController | null>(null);

  const send = useCallback(
    async (message: string): Promise<void> => {
      const problem = messageProblem(message);

      if (problem) {
        dispatch({ type: ChatActionType.Failed, data: problem satisfies ChatError });

        return;
      }

      dispatch({ type: ChatActionType.Sent, data: message.trim() });

      const controller = new AbortController();
      running.current = controller;

      try {
        const ask = { threadId: state.threadId, message: message.trim(), locale: options.locale };

        await run(ask, controller.signal, dispatch);
      } catch (error) {
        // Stopping deliberately is not a failure, and what streamed before it
        // stays on screen.
        dispatch(
          (error as Error)?.name === ABORTED
            ? { type: ChatActionType.Aborted }
            : { type: ChatActionType.Failed, data: "failed" satisfies ChatError },
        );
      } finally {
        running.current = null;
      }
    },
    [dispatch, options.locale, state.threadId],
  );

  const stop = useCallback(() => {
    running.current?.abort();
  }, []);

  return { send, stop };
}
