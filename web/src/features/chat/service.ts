import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { chatClient } from "./client";
import { newThreadId } from "./rules";
import type { Conversation, Turn } from "./types";

/**
 * The rules the BFF owns, between the session and the agent.
 *
 * The subject always comes from the session. Nothing here takes one from a
 * caller, so no request can reach a conversation that is not its own — the
 * agent enforces the same thing again, which is belt and braces on purpose.
 */

export const conversations = cache(async (): Promise<Conversation[]> => {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return [];
  }

  try {
    return await chatClient.conversations(subject);
  } catch {
    // An empty drawer is a better answer than a page that will not render.
    return [];
  }
});

/**
 * One conversation's turns, null when this person has no such thread, and a
 * throw when the agent could not say.
 *
 * The three are kept apart on purpose: turning a timeout into "no such thread"
 * would open a new conversation, and the next thing the person said would be
 * written somewhere other than where they were reading.
 */
export async function transcript(threadId: string): Promise<Turn[] | null> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return null;
  }

  return chatClient.turns(subject, threadId);
}

export async function forget(threadId: string): Promise<boolean> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return false;
  }

  try {
    await chatClient.remove(subject, threadId);

    return true;
  } catch {
    return false;
  }
}

/** What the shell needs to draw the chat: the drawer, and whatever is open. */
export interface ChatView {
  threadId: string;
  turns: Turn[];
  conversations: Conversation[];
  /** The conversation is this person's, but its turns could not be fetched. */
  unavailable: boolean;
}

/**
 * Resolve the conversation a request is looking at.
 *
 * Three outcomes, and keeping them apart is the point. An id that is not this
 * person's reads as no id at all — a new conversation rather than an error
 * page, because the only way to arrive at one is to have typed it. An id we
 * could not ask about keeps the id: the history is missing from the screen, but
 * the next thing said still goes where the person thinks they are.
 */
export async function chatView(requested?: string): Promise<ChatView> {
  const list = await conversations();

  if (!requested) {
    return {
      threadId: newThreadId(),
      turns: [],
      conversations: list,
      unavailable: false,
    };
  }

  try {
    const turns = await transcript(requested);

    return turns
      ? { threadId: requested, turns, conversations: list, unavailable: false }
      : {
          threadId: newThreadId(),
          turns: [],
          conversations: list,
          unavailable: false,
        };
  } catch {
    return {
      threadId: requested,
      turns: [],
      conversations: list,
      unavailable: true,
    };
  }
}
