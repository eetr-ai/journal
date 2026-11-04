"use client";

import { useState } from "react";
import { useChatSender } from "@/features/chat/chat_sender";
import { useEntryInserts } from "@/features/editor/entry_inserts";
import { WIDGET_PRIMARY } from "./widget_frame";
import type { Tap } from "../taps";

export interface AddButtonOptions {
  tap: Tap;
  /** The card as the entry keeps it, or null when it cannot be kept. */
  source: string | null;
  /** The card is still streaming; adding now would keep half of it. */
  live: boolean;
  label: string;
  /** Shown once the card is in the entry. */
  added: string;
  /** Shown once the journal has been asked to add it instead. */
  sent: string;
}

type Done = "added" | "sent" | null;

/**
 * Puts a card's words into the entry on screen, straight into the editor. Only
 * when no editor can take it is the journal asked to do the writing, and then
 * this can only say the ask went.
 *
 * useState because what happened to this card belongs to it and nothing else.
 */
export default function AddButton(options: AddButtonOptions) {
  const { tap } = useChatSender();
  const inserts = useEntryInserts();
  const [done, setDone] = useState<Done>(null);

  const add = () => {
    if (options.source !== null && inserts?.insert(options.source)) {
      setDone("added");

      return;
    }

    setDone("sent");
    void tap(options.tap);
  };

  return (
    <button
      className={WIDGET_PRIMARY}
      disabled={done !== null || options.live}
      onClick={add}
      type="button"
    >
      {done === null ? options.label : options[done]}
    </button>
  );
}
