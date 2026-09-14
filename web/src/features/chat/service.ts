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

/** One conversation's turns, or null when this person has no such thread. */
export async function transcript(threadId: string): Promise<Turn[] | null> {
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return null;
  }

  try {
    return await chatClient.turns(subject, threadId);
  } catch {
    return null;
  }
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
}

/**
 * Resolve the conversation a request is looking at.
 *
 * An id that is not this person's reads as no id at all — a new conversation,
 * rather than an error page — because the only way to arrive at one is to have
 * typed it.
 */
export async function chatView(requested?: string): Promise<ChatView> {
  const list = await conversations();
  const turns = requested ? await transcript(requested) : null;

  return {
    threadId: turns ? (requested as string) : newThreadId(),
    turns: turns ?? [],
    conversations: list,
  };
}
