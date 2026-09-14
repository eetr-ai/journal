"use client";

import { useEffect, useRef, useState } from "react";
import { openEach } from "./sealed";
import { useAgentKey } from "./use_agent_key";
import { ChatActionType, useChat } from "./chat_state";

/**
 * Opens the turns a reopened conversation arrived with.
 *
 * They come off the server sealed — it has nothing to read them with — so the
 * panel shows a placeholder for the beat it takes to get the key out of the
 * vault.
 *
 * Only the turns that were there at mount: those are the record, they are
 * always at the front of the list, and they never change. Reading the live list
 * instead would take a snapshot of a sentence still being streamed and put it
 * back a moment later, erasing what had arrived in between.
 */
export function useOpenedTurns(subject: string, unreadable: string) {
  const { state, dispatch } = useChat();
  const agentKey = useAgentKey(subject);
  const [recorded] = useState(() => state.turns.map((turn) => turn.text));
  const done = useRef(false);

  useEffect(() => {
    if (!agentKey || recorded.length === 0 || done.current) {
      return;
    }

    done.current = true;

    async function open() {
      const texts = await openEach(recorded, agentKey ?? "", unreadable);

      dispatch({ type: ChatActionType.Opened, data: texts });
    }

    void open();
  }, [agentKey, dispatch, recorded, unreadable]);
}
