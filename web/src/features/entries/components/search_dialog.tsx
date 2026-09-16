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
 */
export default function SearchDialog(options: SearchDialogOptions) {
  const { state, dispatch } = useShell();
  const ask = useAsking(options.locale, options.subject);
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const t = options.t.entries.search;

  useEffect(() => {
    if (state.searching) {
      field.current?.focus();
    }
  }, [state.searching]);

  if (!state.searching) {
    return null;
  }

  function close() {
    dispatch({ type: ShellActionType.SearchClosed });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (query.trim() === "") {
      return;
    }

    close();
    ask(query);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-[15vh]">
      <button
        aria-label={options.t.close}
        className="absolute inset-0"
        onClick={close}
        type="button"
      />
      <form
        className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-2 shadow-2xl"
        onSubmit={submit}
      >
        <div className="flex items-center gap-2 px-2">
          <span className="shrink-0 text-muted">
            <MagnifyingGlassIcon size={ICON_SIZE} />
          </span>
          <input
            aria-label={t.open}
            className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none md:text-sm"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && close()}
            placeholder={t.placeholder}
            ref={field}
            value={query}
          />
        </div>
      </form>
    </div>
  );
}
