"use client";

import { createContext, type Dispatch } from "react";
import { useContextNullSafe, type ReducerAction } from "@eetr/react-reducer-utils";
import type { Turn } from "./types";

/**
 * The chat is a managed interaction: it sends, waits, streams in, is stopped
 * part-way, and fails — and has to say which of those it is in. The reducer
 * holds all of it; the composer owns only what is typed.
 */

export type ChatStatus = "idle" | "waiting" | "streaming" | "failed" | "aborted";

export type ChatError = "empty" | "tooLong" | "locked" | "unauthorized" | "unreachable" | "failed";

export interface ChatTurn extends Omit<Turn, "seq"> {
  /** Stable for the life of the panel, which a sequence number is not while streaming. */
  id: string;
  /** How many tools the journal has reached for on this turn, and how many came back. */
  tools: { started: number; finished: number };
}

export function chatTurnFrom(turn: Turn): ChatTurn {
  return { id: `t${turn.seq}`, from: turn.from, text: turn.text, tools: NO_TOOLS };
}

export interface ChatUiState {
  threadId: string;
  status: ChatStatus;
  turns: ChatTurn[];
  error: ChatError | null;
}

export enum ChatActionType {
  Sent = "sent",
  Delta = "delta",
  Tool = "tool",
  Answered = "answered",
  Aborted = "aborted",
  Failed = "failed",
  Started = "started",
}

export type ChatAction = ReducerAction<ChatActionType>;

const NO_TOOLS = { started: 0, finished: 0 };

export function initialChatState(threadId: string, turns: Turn[] = []): ChatUiState {
  return { threadId, status: "idle", turns: turns.map(chatTurnFrom), error: null };
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

function sent(state: ChatUiState, message: string): ChatUiState {
  // The two ids share the position and differ by prefix, so neither depends on
  // the other having been counted.
  const at = state.turns.length;

  return {
    ...state,
    status: "waiting",
    error: null,
    turns: [
      ...state.turns,
      { id: `q${at}`, from: "you", text: message, tools: NO_TOOLS },
      // The empty journal turn is what the stream fills in, so it exists from
      // the moment the message is sent rather than from the first token.
      { id: `a${at}`, from: "journal", text: "", tools: NO_TOOLS },
    ],
  };
}

function tooled(state: ChatUiState, done: boolean): ChatUiState {
  return withStreamingTurn(state, (turn) => ({
    ...turn,
    tools: {
      started: turn.tools.started + (done ? 0 : 1),
      finished: turn.tools.finished + (done ? 1 : 0),
    },
  }));
}

export function chatReducer(state: ChatUiState, action: ChatAction): ChatUiState {
  switch (action.type) {
    case ChatActionType.Sent:
      return sent(state, action.data as string);

    case ChatActionType.Started:
      return { ...state, status: "streaming" };

    case ChatActionType.Delta:
      return withStreamingTurn({ ...state, status: "streaming" }, (turn) => ({
        ...turn,
        text: turn.text + (action.data as string),
      }));

    case ChatActionType.Tool:
      return tooled(state, action.data as boolean);

    // The final frame is the whole answer, so it replaces what streamed rather
    // than appending to it — the two are the same text, and trusting the
    // authoritative one costs nothing.
    case ChatActionType.Answered:
      return withStreamingTurn({ ...state, status: "idle" }, (turn) => ({
        ...turn,
        text: (action.data as string) || turn.text,
      }));

    case ChatActionType.Aborted:
      return { ...state, status: "aborted" };

    case ChatActionType.Failed:
      return { ...state, status: "failed", error: action.data as ChatError };

    default:
      return state;
  }
}

export const ChatStateContext = createContext<ChatUiState | null>(null);
export const ChatDispatchContext = createContext<Dispatch<ChatAction> | null>(null);

export function useChat() {
  return {
    state: useContextNullSafe(ChatStateContext),
    dispatch: useContextNullSafe(ChatDispatchContext),
  };
}
