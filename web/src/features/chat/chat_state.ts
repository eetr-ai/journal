"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { Turn } from "./types";

/**
 * The chat is a managed interaction: it sends, waits, streams in, is steered
 * mid-run, is stopped part-way, and fails — and has to say which of those it is
 * in. The reducer holds all of it; the composer owns only what is typed.
 */

export type ChatStatus = "idle" | "waiting" | "streaming" | "failed" | "aborted";

export type ChatError = "empty" | "tooLong" | "locked" | "unauthorized" | "unreachable" | "failed";

export interface ChatTurn extends Omit<Turn, "seq"> {
  /** Stable for the life of the panel, which a sequence number is not while streaming. */
  id: string;
  /**
   * The model's reasoning for this turn, as it arrived. Shown and never stored:
   * it rides on the assistant turn rather than being folded into the answer, so
   * nothing downstream of the browser ever sees it.
   */
  reasoning: string;
  /** How many tools the journal has reached for on this turn, and how many came back. */
  tools: { started: number; finished: number };
}

export interface ChatUiState {
  threadId: string;
  status: ChatStatus;
  turns: ChatTurn[];
  error: ChatError | null;
}

export enum ChatActionType {
  Sent = "sent",
  FollowUp = "followUp",
  Started = "started",
  Delta = "delta",
  Reasoning = "reasoning",
  Tool = "tool",
  Answered = "answered",
  Settled = "settled",
  Aborted = "aborted",
  Failed = "failed",
}

export type ChatAction = ReducerAction<ChatActionType>;

const NO_TOOLS = { started: 0, finished: 0 };

export function initialChatState(threadId: string, turns: Turn[] = []): ChatUiState {
  return { threadId, status: "idle", turns: turns.map(chatTurnFrom), error: null };
}

export function chatTurnFrom(turn: Turn): ChatTurn {
  return {
    id: `t${turn.seq}`,
    from: turn.from,
    text: turn.text,
    at: turn.at,
    reasoning: "",
    tools: NO_TOOLS,
  };
}

function said(from: Turn["from"], id: string, text: string): ChatTurn {
  return { id, from, text, at: new Date().toISOString(), reasoning: "", tools: NO_TOOLS };
}

/** The journal's turn is always the last one while a run is in flight. */
function withStreamingTurn(state: ChatUiState, change: (turn: ChatTurn) => ChatTurn): ChatUiState {
  if (state.turns.length === 0) {
    return state;
  }

  const turns = [...state.turns];
  const last = turns.length - 1;
  turns[last] = change(turns[last]);

  return { ...state, turns };
}

/**
 * A run that ended without producing anything leaves no empty turn behind: it
 * would go on saying "thinking" underneath a notice saying it had stopped. A
 * turn with text in it stays — a part-answer is still an answer.
 */
function ended(state: ChatUiState): ChatUiState {
  const last = state.turns.at(-1);

  if (!last || last.from !== "journal" || last.text !== "") {
    return state;
  }

  return { ...state, turns: state.turns.slice(0, -1) };
}

/**
 * A handler per action rather than one switch: the set grew past what a single
 * function should branch on, and adding a case should not mean editing one.
 */
const handlers: Record<ChatActionType, (state: ChatUiState, action: ChatAction) => ChatUiState> = {
  [ChatActionType.Sent]: (state, action) => {
    // The two ids share the position and differ by prefix, so neither depends
    // on the other having been counted.
    const at = state.turns.length;

    return {
      ...state,
      status: "waiting",
      error: null,
      turns: [
        ...state.turns,
        said("you", `q${at}`, action.data as string),
        // The empty journal turn is what the stream fills in, so it exists from
        // the moment the message is sent rather than from the first token.
        said("journal", `a${at}`, ""),
      ],
    };
  },

  // A message handed to a run already going. It joins the answer being written
  // rather than starting one of its own, so there is no second journal turn and
  // the status does not move.
  [ChatActionType.FollowUp]: (state, action) => ({
    ...state,
    error: null,
    turns: [
      ...state.turns.slice(0, -1),
      said("you", `q${state.turns.length}`, action.data as string),
      ...state.turns.slice(-1),
    ],
  }),

  [ChatActionType.Started]: (state) => ({ ...state, status: "streaming" }),

  [ChatActionType.Delta]: (state, action) =>
    withStreamingTurn({ ...state, status: "streaming" }, (turn) => ({
      ...turn,
      text: turn.text + (action.data as string),
    })),

  [ChatActionType.Reasoning]: (state, action) =>
    withStreamingTurn({ ...state, status: "streaming" }, (turn) => ({
      ...turn,
      reasoning: turn.reasoning + (action.data as string),
    })),

  [ChatActionType.Tool]: (state, action) =>
    withStreamingTurn(state, (turn) => ({
      ...turn,
      tools: {
        started: turn.tools.started + (action.data ? 0 : 1),
        finished: turn.tools.finished + (action.data ? 1 : 0),
      },
    })),

  // The final frame is the whole answer, so it replaces what streamed rather
  // than appending to it — the two are the same text, and trusting the
  // authoritative one costs nothing.
  [ChatActionType.Answered]: (state, action) =>
    withStreamingTurn({ ...state, status: "idle" }, (turn) => ({
      ...turn,
      text: (action.data as string) || turn.text,
    })),

  // The stream closed with no final answer — a stop, or a run that simply
  // ended. Whatever streamed stays.
  [ChatActionType.Settled]: (state) =>
    state.status === "idle" ? state : { ...ended(state), status: "idle" },

  [ChatActionType.Aborted]: (state) => ({ ...ended(state), status: "aborted" }),

  [ChatActionType.Failed]: (state, action) => ({
    ...ended(state),
    status: "failed",
    error: action.data as ChatError,
  }),
};

export function chatReducer(state: ChatUiState, action: ChatAction): ChatUiState {
  return handlers[action.type]?.(state, action) ?? state;
}

export const ChatStateContext = createContext<ChatUiState | null>(null);
export const ChatDispatchContext = createContext<Dispatch<ChatAction> | null>(null);

export function useChat() {
  return {
    state: useContextNullSafe(ChatStateContext),
    dispatch: useContextNullSafe(ChatDispatchContext),
  };
}
