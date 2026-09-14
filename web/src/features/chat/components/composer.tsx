"use client";

import { useState } from "react";
import { PaperPlaneRightIcon, StopIcon } from "@phosphor-icons/react";
import { useChat } from "../chat_state";
import { messageProblem } from "../rules";
import { useChatStream } from "../use_chat_stream";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface ComposerOptions {
  t: Dictionary;
  locale: Locale;
}

// useState for the draft: it is a small leaf that owns nothing beyond itself,
// and nothing outside this box has any business knowing what is half-typed.
export default function Composer(options: ComposerOptions) {
  const [draft, setDraft] = useState("");
  const { state } = useChat();
  const { send, stop } = useChatStream({ locale: options.locale });
  const t = options.t.chat;

  const busy = state.status === "waiting" || state.status === "streaming";

  async function submit() {
    // Cleared only once it is going to be sent. A message refused for being too
    // long is a message the person still has to edit.
    if (messageProblem(draft)) {
      await send(draft);

      return;
    }

    const message = draft;
    setDraft("");
    await send(message);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <input
        className="flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !busy) {
            void submit();
          }
        }}
        placeholder={t.placeholder}
        value={draft}
      />
      {busy ? (
        <button aria-label={t.stop} className="text-muted" onClick={stop} type="button">
          <StopIcon size={ICON_SIZE} weight="fill" />
        </button>
      ) : (
        <button
          aria-label={t.send}
          className="text-muted disabled:opacity-40"
          disabled={draft.trim() === ""}
          onClick={() => void submit()}
          type="button"
        >
          <PaperPlaneRightIcon size={ICON_SIZE} weight="fill" />
        </button>
      )}
    </div>
  );
}
