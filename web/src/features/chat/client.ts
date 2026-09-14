import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import {
  conversationFromEntity,
  turnFromEntity,
  type ChatAsk,
  type Conversation,
  type ConversationsEntity,
  type TranscriptEntity,
  type Turn,
} from "./types";

/**
 * The only thing in the app that knows how conversations are stored and how the
 * agent is asked to answer one.
 *
 * The message and the answer pass through here in the clear for the length of
 * the request. Nothing in this module logs a body, and nothing downstream
 * should either.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
// The agent thinks before it says anything, so the stream's timeout bounds
// reaching it rather than finishing with it.
const STREAM_CONNECT_TIMEOUT_MS = 45_000;
const NOT_FOUND = 404;
const ATTEMPTS = 2;
const ONE_ATTEMPT = 1;

let client: RestClient | undefined;

function agent(): RestClient {
  client ??= new RestClient({
    baseUrl: process.env.AGENT_URL ?? DEFAULT_AGENT_URL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    retry: { attempts: ATTEMPTS },
    defaultInit: { cache: "no-store" },
  });

  return client;
}

// Subjects are issuer-shaped and routinely carry `|` and `:`.
function chatPath(subject: string): string {
  return `/chat/${encodeURIComponent(subject)}`;
}

function chatsPath(subject: string): string {
  return `/chats/${encodeURIComponent(subject)}`;
}

export interface StreamParams {
  subject: string;
  ask: ChatAsk;
  signal?: AbortSignal;
}

export const chatClient = {
  /** Every conversation this subject has, most recently active first. */
  async conversations(subject: string): Promise<Conversation[]> {
    const response = await agent().get<ConversationsEntity>(chatsPath(subject));

    return response.getOrThrow().chats.map(conversationFromEntity);
  },

  /** One conversation's turns in order, or null when there is no such thread. */
  async turns(subject: string, threadId: string): Promise<Turn[] | null> {
    const response = await agent().get<TranscriptEntity>(
      `${chatsPath(subject)}/${encodeURIComponent(threadId)}`,
    );

    if (response.status === NOT_FOUND) {
      return null;
    }

    return response.getOrThrow().turns.map(turnFromEntity);
  },

  async remove(subject: string, threadId: string): Promise<void> {
    const response = await agent().delete(`${chatsPath(subject)}/${encodeURIComponent(threadId)}`);

    response.getOrThrow();
  },

  /**
   * The agent's answer as it is produced, or null when it refused or could not
   * be reached. The body is never read here, so the caller owns its end — and
   * cancelling that stream is what stops the run, because the abort signal goes
   * deaf once the body is handed over.
   */
  async stream(params: StreamParams): Promise<ReadableStream<Uint8Array> | null> {
    const response = await agent().post<ReadableStream<Uint8Array> | null>(
      chatPath(params.subject),
      params.ask,
      {
        decode: "stream",
        // A retried POST is a second turn in the conversation, charged and
        // remembered twice.
        retry: { attempts: ONE_ATTEMPT },
        timeoutMs: STREAM_CONNECT_TIMEOUT_MS,
        signal: params.signal,
        headers: {
          accept: "text/event-stream",
          // What ends a run in flight. Set here from what the BFF decided, never
          // forwarded from the browser: what a client sends is a request, and
          // what reaches the agent is this layer's decision.
          ...(params.ask.intent === "stop" ? { "X-Agent-Stop": "1" } : {}),
        },
      },
    );

    if (!response.ok || !response.body) {
      await response.raw?.body?.cancel();

      return null;
    }

    return response.body;
  },
};
