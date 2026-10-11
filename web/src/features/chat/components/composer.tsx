"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import ComposerActions from "./composer_actions";
import AttachButton from "@/features/images/components/attach_button";
import AttachmentTray from "@/features/images/components/attachment_tray";
import { useAttachments } from "@/features/images/use_attachments";
import { useImagesConfig } from "@/features/images/images_config";
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
 * nothing outside this box has any business knowing what is half-typed. The
 * same goes for the pictures waiting to go with it.
 */
/**
 * What is typed, what is attached, and sending them. Split from the markup only
 * so each reads on its own.
 */
function useComposer(options: ComposerOptions, box: RefObject<HTMLTextAreaElement | null>) {
  const [draft, setDraft] = useState("");
  const { state } = useChat();
  const { send, stop } = useChatStream({
    locale: options.locale,
    subject: options.subject,
  });
  const images = useImagesConfig();
  const pictures = useAttachments(images.maxImages);

  // After the commit rather than on the keystroke: scrollHeight is read off the
  // DOM, and on the keystroke that clears the box the DOM still holds the long
  // message — so the box kept the height of what was just sent.
  useLayoutEffect(() => fit(box.current), [box, draft]);

  const busy = state.status === "waiting" || state.status === "streaming";
  const withImages = pictures.attachments.length > 0;

  async function submit() {
    // Pictures cannot join an answer already being written.
    if (withImages && busy) {
      pictures.refuse("busy");

      return;
    }

    const problem = messageProblem(draft, withImages);

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
    const attached = pictures.attachments;
    setDraft("");
    pictures.clear();
    box.current?.focus();
    await send(message, attached);
  }

  return { draft, setDraft, busy, withImages, images, pictures, submit, stop };
}

export default function Composer(options: ComposerOptions) {
  const box = useRef<HTMLTextAreaElement>(null);
  const composer = useComposer(options, box);
  const { images, pictures } = composer;

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <AttachmentTray
        attachments={pictures.attachments}
        maxImages={images.maxImages}
        onRemove={pictures.remove}
        problem={pictures.problem}
        t={options.t}
      />
      <div className="flex items-end gap-2">
        {images.allowed ? (
          <AttachButton
            disabled={composer.busy || pictures.attachments.length >= images.maxImages}
            label={options.t.images.attach}
            onFiles={(files) => void pictures.add(files)}
          />
        ) : null}
        <textarea
          className="max-h-44 flex-1 resize-none bg-transparent py-1 text-base outline-none md:text-sm"
          onChange={(event) => composer.setDraft(event.target.value)}
          enterKeyHint="enter"
          onKeyDown={(event) => {
            // Enter sends, shift-Enter is a new line — which is the convention
            // every chat box uses, and the reason this is a textarea at all.
            //
            // Except while an input method is open, where Enter is how a
            // candidate is chosen. Sending there would post a half-written word
            // and swallow the keystroke that was going to finish it.
            //
            // And except on a soft keyboard, which has no shift to hold: there
            // Enter is the only way to start a line, and the button beside this
            // is how a message goes. Asked at the keystroke rather than at render
            // so nothing about the markup depends on it.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !window.matchMedia("(pointer: coarse)").matches
            ) {
              event.preventDefault();
              void composer.submit();
            }
          }}
          placeholder={options.t.chat.placeholder}
          ref={box}
          rows={1}
          value={composer.draft}
        />
        <ComposerActions
          busy={composer.busy}
          canSend={composer.draft.trim() !== "" || composer.withImages}
          onSend={() => void composer.submit()}
          onStop={() => void composer.stop()}
          t={options.t}
        />
      </div>
    </div>
  );
}
