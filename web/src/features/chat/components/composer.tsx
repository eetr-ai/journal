"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ComposerActions from "./composer_actions";
import { useChat } from "../chat_state";
import { messageProblem } from "../rules";
import { useChatStream } from "../use_chat_stream";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

// About eight lines. Past that the box stops growing and scrolls instead, so a
// long message cannot push the conversation off the screen.
const MAX_HEIGHT_PX = 176;

export interface ComposerOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
}

/** Grows with what is typed, up to a point, then scrolls. */
function fit(box: HTMLTextAreaElement | null): void {
  if (!box) {
    return;
  }

  // Reset first: scrollHeight only ever grows while an explicit height is set,
  // so a box that has shrunk would otherwise stay tall.
  box.style.height = "auto";
  box.style.height = `${Math.min(box.scrollHeight, MAX_HEIGHT_PX)}px`;
}

/**
 * The box never goes dead while the journal is answering: a message sent then
 * joins the run in flight rather than starting another, which is the whole
 * point of being able to change your mind mid-sentence.
 *
 * Focus is put back by hand after a send, because React drops it whenever an
 * input's disabled state changes and it used to.
 *
 * useState for the draft: a small leaf that owns nothing beyond itself, and
 * nothing outside this box has any business knowing what is half-typed.
 */
export default function Composer(options: ComposerOptions) {
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const { state } = useChat();
  const { send, stop } = useChatStream({
    locale: options.locale,
    subject: options.subject,
  });

  // After the commit rather than on the keystroke: scrollHeight is read off the
  // DOM, and on the keystroke that clears the box the DOM still holds the long
  // message — so the box kept the height of what was just sent.
  useLayoutEffect(() => fit(box.current), [draft]);
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
    <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2">
      <textarea
        className="max-h-44 flex-1 resize-none bg-transparent py-1 text-sm outline-none"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, shift-Enter is a new line — which is the convention
          // every chat box uses, and the reason this is a textarea at all.
          //
          // Except while an input method is open, where Enter is how a
          // candidate is chosen. Sending there would post a half-written word
          // and swallow the keystroke that was going to finish it.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder={t.placeholder}
        ref={box}
        rows={1}
        value={draft}
      />
      <ComposerActions
        busy={busy}
        canSend={draft.trim() !== ""}
        onSend={() => void submit()}
        onStop={() => void stop()}
        t={options.t}
      />
    </div>
  );
}
