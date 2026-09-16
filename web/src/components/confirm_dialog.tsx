"use client";

import { useEffect, useRef } from "react";

export interface ConfirmDialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A question with two answers, over the page that asked it.
 *
 * Not route-driven, unlike the overlay cover: a confirmation is not a place in
 * the app, and giving it a URL would put "are you sure?" in someone's history
 * and let a reload re-ask a question about an entry that may already be gone.
 *
 * Focus lands on Cancel and goes back where it came from on the way out.
 */
/**
 * Opened with showModal(), which is what makes it a modal rather than a
 * rectangle that looks like one: the browser traps focus, makes the page behind
 * inert, and turns Escape into a `cancel` event. Doing that by hand means
 * reimplementing a focus trap, and a confirmation a keyboard can walk out of is
 * a confirmation that can be answered by the thing behind it.
 *
 * The overlay cover elsewhere in the app cannot do this — it belongs to a route
 * and the top layer would take the page's scroll position with it. This one
 * belongs to a moment.
 */
function useModal(onCancel: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;

    dialog?.showModal();

    return () => {
      dialog?.close();

      // The page behind may have moved on while the question was up.
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [onCancel]);

  return ref;
}

export default function ConfirmDialog(options: ConfirmDialogOptions) {
  const ref = useModal(options.onCancel);

  return (
    <dialog
      aria-labelledby="confirm-title"
      className="m-auto w-full max-w-sm rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      // Escape arrives here, not as a keydown: the browser raises `cancel` and
      // would otherwise close the dialog without telling the page that owns it.
      onCancel={(event) => {
        event.preventDefault();
        options.onCancel();
      }}
      // No backdrop dismissal: a stray click beside a question about throwing
      // somebody's day away should not answer it. Escape and Cancel are the two
      // ways out, and both say the same thing.
      ref={ref}
    >
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold" id="confirm-title">
          {options.title}
        </h2>
        <p className="mt-2 text-sm text-muted">{options.body}</p>
      </div>
      <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
        {/* First in the order the browser focuses, so the dangerous answer is
            never the one a stray Return key finds. */}
        <button
          autoFocus
          className="rounded-md px-3 py-1.5 text-sm hover:bg-surface-muted"
          onClick={options.onCancel}
          type="button"
        >
          {options.cancelLabel}
        </button>
        <button
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90"
          onClick={options.onConfirm}
          type="button"
        >
          {options.confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}
