"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "@phosphor-icons/react";

const ICON_SIZE = 18;

export interface OverlayDialogOptions {
  title: string;
  subtitle?: string;
  closeLabel: string;
  /** Where closing goes. Closing is a navigation, not hidden state. */
  closeHref: string;
  children: React.ReactNode;
}

/**
 * A cover over the page behind it, with a URL of its own — so it survives a
 * reload, can be linked, and the back button does what it looks like it does.
 */
export default function OverlayDialog(options: OverlayDialogOptions) {
  const router = useRouter();

  function close() {
    router.push(options.closeHref);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(options.closeHref);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, options.closeHref]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      {/* The backdrop closes on click; the panel stops the click reaching it. */}
      <button
        aria-label={options.closeLabel}
        className="absolute inset-0 cursor-default"
        onClick={close}
        type="button"
      />

      {/* A real <dialog>, kept open declaratively: the backdrop above is ours,
          because showModal() would put this in the top layer and take the
          route's scroll position with it. */}
      <dialog
        aria-labelledby="overlay-title"
        aria-modal
        className="relative m-0 w-full max-w-3xl rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl"
        open
      >
        <header className="flex items-start gap-4 border-b border-border px-6 py-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold" id="overlay-title">
              {options.title}
            </h1>
            {options.subtitle && <p className="mt-0.5 text-sm text-muted">{options.subtitle}</p>}
          </div>
          <button
            aria-label={options.closeLabel}
            className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
            onClick={close}
            type="button"
          >
            <XIcon size={ICON_SIZE} weight="bold" />
          </button>
        </header>

        <div className="p-6">{options.children}</div>
      </dialog>
    </div>
  );
}
