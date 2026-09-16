"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { ShellActionType, useShell } from "@/features/shell/shell_state";
import { useAsking } from "../use_asking";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface SearchDialogOptions {
  t: Dictionary;
  locale: Locale;
  subject: string;
}

/**
 * Where a question is typed, over whatever was being read.
 *
 * A box of its own rather than a field in the drawer: on a phone the drawer is
 * already a cover, and a question deserves the width of the screen rather than
 * the sixteen rems a list was sized for.
 *
 * Opened with showModal(), the same way the confirmation is, because that is
 * what makes it a modal rather than a rectangle that looks like one: the
 * browser traps focus, makes the page behind inert, and turns Escape into a
 * `cancel` event. A search box a keyboard can walk out of leaves the covered
 * app tabbable behind it.
 */
/** Open while asked for, closed on the way out, and focus put back where it
 *  came from — the page behind may have moved on while the box was up. */
function useModal(
  dialog: React.RefObject<HTMLDialogElement | null>,
  field: React.RefObject<HTMLInputElement | null>,
  open: boolean,
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const element = dialog.current;
    const previous = document.activeElement;

    element?.showModal();
    // showModal puts focus on the dialog; this box is the only thing in it
    // worth having it.
    field.current?.focus();

    return () => {
      element?.close();

      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [open, dialog, field]);
}

export default function SearchDialog(options: SearchDialogOptions) {
  const { state, dispatch } = useShell();
  const ask = useAsking(options.locale, options.subject);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const t = options.t.entries.search;

  useModal(ref, field, state.searching);

  if (!state.searching) {
    return null;
  }

  function close() {
    setQuery("");
    dispatch({ type: ShellActionType.SearchClosed });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const asked = query.trim();

    if (asked === "") {
      return;
    }

    close();
    ask(asked);
  }

  return (
    <dialog
      aria-label={t.open}
      className="m-0 w-full max-w-lg rounded-xl border border-border bg-surface p-2 text-foreground shadow-2xl backdrop:bg-black/40 mx-auto mt-[15vh]"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      ref={ref}
    >
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 px-2">
          <span className="shrink-0 text-muted">
            <MagnifyingGlassIcon size={ICON_SIZE} />
          </span>
          <input
            aria-label={t.open}
            className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none md:text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.placeholder}
            ref={field}
            value={query}
          />
        </div>
      </form>
    </dialog>
  );
}
