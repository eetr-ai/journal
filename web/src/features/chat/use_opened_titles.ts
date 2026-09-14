"use client";

import { useEffect, useState } from "react";
import { openSealed } from "./sealed";
import { useAgentKey } from "./use_agent_key";
import type { Conversation } from "./types";

/**
 * Conversation titles by id, opened.
 *
 * Empty until the key is out of the vault, which is a blank line in the drawer
 * for a beat — better than a line of base64, and the alternative is a server
 * that can read them.
 */
export function useOpenedTitles(
  conversations: Conversation[],
  subject: string,
  unreadable: string,
): Record<string, string> {
  const [ret, setRet] = useState<Record<string, string>>({});
  const agentKey = useAgentKey(subject);
  // The list is rebuilt on every render of the page above, so the effect turns
  // on what is in it rather than on the array holding it.
  const sealed = JSON.stringify(
    conversations.map((conversation) => [conversation.id, conversation.title]),
  );

  useEffect(() => {
    if (!agentKey) {
      return;
    }

    let live = true;

    async function open() {
      const pairs = JSON.parse(sealed) as [string, string][];
      const opened: Record<string, string> = {};

      for (const [id, title] of pairs) {
        opened[id] = (await openSealed(title, agentKey ?? "")) ?? unreadable;
      }

      if (live) {
        setRet(opened);
      }
    }

    void open();

    return () => {
      live = false;
    };
  }, [agentKey, sealed, unreadable]);

  return ret;
}
