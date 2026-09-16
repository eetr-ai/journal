"use client";

import { useEffect } from "react";
import { openSealed } from "@/features/chat/sealed";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { EntriesActionType, useEntries } from "./entries_state";
import type { Entry, OpenedEntry } from "./types";

/**
 * Opens whatever is in the list and has not been opened yet.
 *
 * Entries arrive sealed from the page and sealed again from the stream, so this
 * runs on both: the effect settles because opening is what empties the list it
 * watches, and an entry rewritten mid-conversation drops out of `opened` and
 * comes straight back through here.
 *
 * An entry the key will not open shows a stand-in rather than nothing, so a
 * journal written under an older key still reads as a journal with a gap in it.
 */
async function openOne(entry: Entry, key: string, unreadable: string): Promise<OpenedEntry> {
  return {
    title: (await openSealed(entry.title, key)) ?? unreadable,
    content: (await openSealed(entry.content, key)) ?? unreadable,
  };
}

export function useOpenedEntries(subject: string, unreadable: string) {
  const { state, dispatch } = useEntries();
  const agentKey = useAgentKey(subject);
  const { entries, opened } = state;

  useEffect(() => {
    const pending = entries.filter((entry) => !(entry.id in opened));

    if (!agentKey || pending.length === 0) {
      return;
    }

    let abandoned = false;

    async function open(key: string) {
      const pairs = await Promise.all(
        pending.map(async (entry) => [entry.id, await openOne(entry, key, unreadable)] as const),
      );

      // The panel may have moved on while the key was working.
      if (!abandoned) {
        dispatch({
          type: EntriesActionType.Opened,
          data: Object.fromEntries(pairs),
        });
      }
    }

    void open(agentKey);

    return () => {
      abandoned = true;
    };
  }, [agentKey, dispatch, entries, opened, unreadable]);
}
