"use client";

import { useRef, useState } from "react";
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

/**
 * The box never goes dead while the journal is answering: a message sent then
 * joins the run in flight rather than starting another, which is the whole
 * point of being able to change your mind mid-sentence.
 *
 * Focus is put back by hand after a send. React drops it whenever an input's
 * disabled state changes, and it used to — you had to click back into the box
 * after every message.
 *
 * useState for the draft: a small leaf that owns nothing beyond itself, and
 * nothing outside this box has any business knowing what is half-typed.
 */
export default function Composer(options: ComposerOptions) {
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLInputElement>(null);
  const { state } = useChat();
  const { send, stop } = useChatStream({ locale: options.locale });
  const t = options.t.chat;

  const busy = state.status === "waiting" || state.status === "streaming";

  async function submit() {
    const problem = messageProblem(draft);

    // Enter on an empty box is not a mistake worth an error message — the send
    // button is disabled for the same reason.
    if (problem === "empty") {
      return;
    }

    // Cleared only once it is going to be sent: a message refused for being too
    // long is a message the person still has to edit.
    if (problem) {
      await send(draft);

      return;
    }

    const message = draft;
    setDraft("");
    box.current?.focus();
    await send(message);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <input
        className="flex-1 bg-transparent text-sm outline-none"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void submit();
          }
        }}
        placeholder={t.placeholder}
        ref={box}
        value={draft}
      />
      {busy ? (
        <button
          aria-label={t.stop}
          className="text-muted"
          onClick={() => void stop()}
          type="button"
        >
          <StopIcon size={ICON_SIZE} weight="fill" />
        </button>
      ) : null}
      <button
        aria-label={t.send}
        className="text-muted disabled:opacity-40"
        disabled={draft.trim() === ""}
        onClick={() => void submit()}
        type="button"
      >
        <PaperPlaneRightIcon size={ICON_SIZE} weight="fill" />
      </button>
    </div>
  );
}
