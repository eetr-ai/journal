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
 * Focus lands on Cancel and goes back where it came from on the way out, so the
 * dangerous answer is never the one a stray Return key finds.
 */
function useConfirmFocus(onCancel: () => void) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;

    ref.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      // The page behind may have moved on while the question was up.
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [onCancel]);

  return ref;
}

export default function ConfirmDialog(options: ConfirmDialogOptions) {
  const cancelRef = useConfirmFocus(options.onCancel);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      {/* The backdrop cancels. Hidden from assistive tech and out of the tab
          order, because the button below is the same answer with a real name. */}
      <button
        aria-hidden
        className="absolute inset-0 cursor-default"
        onClick={options.onCancel}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-labelledby="confirm-title"
        aria-modal
        className="relative m-0 w-full max-w-sm rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl"
        open
      >
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold" id="confirm-title">
            {options.title}
          </h2>
          <p className="mt-2 text-sm text-muted">{options.body}</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            className="rounded-md px-3 py-1.5 text-sm hover:bg-surface-muted"
            onClick={options.onCancel}
            ref={cancelRef}
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
    </div>
  );
}
