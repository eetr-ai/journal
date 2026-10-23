"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { openChat, steerChat } from "./browser_client";
import { readFrames } from "./stream_reader";
import { messageProblem } from "./rules";
import { useAgentKey } from "./use_agent_key";
import { ChatActionType, useChat, type ChatError, type SentMessage } from "./chat_state";
import { EntriesActionType, useEntries } from "@/features/entries/entries_state";
import { useOpenEntry } from "@/features/entries/use_open_entry";
import { viewHref } from "@/features/shell/view_url";
import { chooseLayout } from "@/features/shell/layout_store";
import type { AgentFrame, ChatAsk } from "./types";
import type { Attachment } from "@/features/images/types";
import { asksForAnswer, tapLine, withTaps, type Tap } from "@/features/widgets/taps";
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
    case "image":
      return { type: EntriesActionType.Pictured, data: frame.entryId };
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
      return { type: ChatActionType.Tool, data: frame };
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
function refuse(message: string, agentKey: string | null, withImages: boolean): ChatError | null {
  return messageProblem(message, withImages) ?? (agentKey ? null : "locked");
}

function dataUrl(attachment: Attachment): string {
  return `data:${attachment.mimeType};base64,${attachment.data}`;
}

// The one refusal worth its own words. Everything the journal writes down is
// filed under the reader's day, and until the browser has said which zone that
// is there is no such day — so this is "not yet", and saying "could not be
// reached" would send someone looking for a fault that is not there.
const TOO_EARLY = 409;

/**
 * A conversation exists once the agent has accepted a run on it, so that is when
 * it earns its place in the address. Replaced rather than pushed: nothing was
 * navigated.
 */
function markConversation(threadId: string) {
  const current = new URLSearchParams(window.location.search);

  if (current.get("chat") === threadId) {
    return;
  }

  window.history.replaceState(
    null,
    "",
    viewHref(window.location.pathname, current, { chat: threadId }),
  );
}

function refusal(status: number): ChatError {
  return status === TOO_EARLY ? "notReady" : "unreachable";
}

type Dispatcher = (action: { type: ChatActionType; data?: unknown }) => void;
type PanelDispatcher = (action: { type: EntriesActionType; data?: unknown }) => void;

/** Drains one run into the two reducers it feeds, and the page's layout. */
async function pump(
  body: ReadableStream<Uint8Array>,
  dispatch: Dispatcher,
  panel: PanelDispatcher,
): Promise<void> {
  for await (const frame of readFrames(body)) {
    // Kept on this device as if they had chosen it themselves: they asked.
    if (frame.kind === "layout") {
      chooseLayout(frame.layout);

      continue;
    }

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
  const { status, body } = await openChat({ ask, signal });

  if (!body) {
    dispatch({ type: ChatActionType.Failed, data: refusal(status) });

    return false;
  }

  dispatch({ type: ChatActionType.Started });
  markConversation(ask.threadId);
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

/**
 * How a message is addressed: which conversation, in what language, under what
 * key, and which entry the reader has open while they say it.
 */
function useAsk(threadId: string, locale: Locale, agentKey: string | null) {
  const open = useOpenEntry();

  // `toToday` sends without the open entry, so a write lands in this
  // conversation's own note whatever the panel happens to be showing.
  return useCallback(
    (
      message: string,
      intent: ChatAsk["intent"],
      images: Attachment[] = [],
      toToday = false,
    ): ChatAsk => ({
      threadId,
      message,
      locale,
      key: agentKey ?? "",
      intent,
      ...(open && !toToday ? { working: { id: open.id, date: open.date } } : {}),
      ...(images.length > 0 ? { images } : {}),
    }),
    [agentKey, locale, open, threadId],
  );
}

type Ask = ReturnType<typeof useAsk>;

/**
 * The run this conversation has, if any: saying something onto it, new or in
 * flight, and stopping it. Both live here because both turn on whether one is
 * going, and that is held nowhere else.
 */
function useRun(ask: Ask) {
  const { dispatch } = useChat();
  const running = useRef<AbortController | null>(null);
  // The journal beside the conversation. The agent writes into it mid-run, so
  // the stream that carries the answer carries those frames too.
  const { dispatch: panel } = useEntries();
  const router = useRouter();

  /** A message already judged sendable, taps and all. */
  const say = useCallback(
    async (message: string, images: Attachment[], toToday = false): Promise<void> => {
      // A run already holds this conversation, so this joins it. The answer
      // keeps arriving where it already was. Pictures cannot join a run in
      // flight, so the composer never offers them here.
      //
      // Shown only once it has landed: a follow-up the BFF refused never
      // reached the conversation, and leaving it on screen would say it had.
      if (running.current) {
        const joined = await steerChat(ask(message, "say", [], toToday));

        dispatch(
          joined
            ? { type: ChatActionType.FollowUp, data: message }
            : {
                type: ChatActionType.Failed,
                data: "failed" satisfies ChatError,
              },
        );

        return;
      }

      dispatch({
        type: ChatActionType.Sent,
        data: { text: message, images: images.map(dataUrl) } satisfies SentMessage,
      });
      running.current = new AbortController();

      try {
        await runToEnd(ask(message, "say", images, toToday), running.current, dispatch, panel);
      } finally {
        running.current = null;
        // The conversation may be new, and the drawer beside this panel was
        // rendered before it existed.
        router.refresh();
      }
    },
    [ask, dispatch, panel, router],
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

  return { say, stop };
}

export function useChatStream(options: ChatStreamOptions) {
  const { state, dispatch } = useChat();
  const { dispatch: entries } = useEntries();
  // Taps the agent should know about but need no answer of their own. They go
  // with the next thing sent, ahead of it.
  const noted = useRef<Tap[]>([]);
  const agentKey = useAgentKey(options.subject);

  const ask = useAsk(state.threadId, options.locale, agentKey);
  const { say, stop } = useRun(ask);

  const send = useCallback(
    async (typed: string, images: Attachment[] = []): Promise<void> => {
      const problem = refuse(typed, agentKey, images.length > 0);

      if (problem) {
        dispatch({ type: ChatActionType.Failed, data: problem });

        return;
      }

      const message = withTaps(noted.current, typed.trim());

      noted.current = [];
      await say(message, images);
    },
    [agentKey, dispatch, say],
  );

  /**
   * A tap on a widget. One that asks for an answer is sent now, by the same
   * path as anything typed, so mid-answer it joins the run like a follow-up.
   * One that does not is held for whatever is sent next.
   */
  const tap = useCallback(
    async (tapped: Tap): Promise<void> => {
      const others = noted.current.filter((held) => tapLine(held) !== tapLine(tapped));

      if (!asksForAnswer(tapped)) {
        noted.current = [...others, tapped];

        return;
      }

      if (!agentKey) {
        dispatch({ type: ChatActionType.Failed, data: "locked" satisfies ChatError });

        return;
      }

      noted.current = [];

      // Writing from a memory starts today's note. The memory may be the entry
      // the panel is showing, and a write with it open would go over it, so
      // the panel goes back to today and the write is sent without it.
      const writing = tapped.act === "write";

      if (writing) {
        entries({ type: EntriesActionType.Closed });
      }

      await say(withTaps([...others, tapped], ""), [], writing);
    },
    [agentKey, dispatch, entries, say],
  );

  return { send, stop, tap };
}
