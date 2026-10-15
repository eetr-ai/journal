"use client";

import { useState } from "react";
import { useChatSender } from "@/features/chat/chat_sender";
import { WIDGET_PRIMARY } from "./widget_frame";
import type { Tap } from "../taps";

export interface AddButtonOptions {
  tap: Tap;
  label: string;
  sent: string;
}

/**
 * Asks the journal to put a card's words into the entry. The agent does the
 * writing, so this can only say the ask went; the entry beside the conversation
 * is where it shows that it landed.
 *
 * useState because having asked once belongs to this card and nothing else.
 */
export default function AddButton(options: AddButtonOptions) {
  const { tap } = useChatSender();
  const [asked, setAsked] = useState(false);

  return (
    <button
      className={WIDGET_PRIMARY}
      disabled={asked}
      onClick={() => {
        setAsked(true);
        void tap(options.tap);
      }}
      type="button"
    >
      {asked ? options.sent : options.label}
    </button>
  );
}
