"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useAgentKey } from "@/features/chat/use_agent_key";
import { EntriesActionType, useEntries } from "../entries_state";
import { useShowEntry } from "../use_show_entry";
import { SearchActionType, useSearch } from "../search_state";
import { searchEntriesAction } from "../actions";
import { queryProblem, MAX_QUERY_CHARS } from "../rules";
import { shortDayIn } from "../days";
import type { SearchHit } from "../types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;

export interface EntrySearchOptions {
  t: Dictionary;
  locale: Locale;
  /** Whose vault holds the key the entries are sealed under. */
  subject: string;
}

/**
 * Asking the journal a question.
 *
 * The key goes with the question, because the entries have to be opened to be
 * ranked and this browser is the only thing that can open them. What comes back
 * is sealed again, so the hits are folded into the entries list and decrypted
 * by the same effect that decrypts everything else.
 */
export default function EntrySearch(options: EntrySearchOptions) {
  const { state, dispatch } = useSearch();
  const entries = useEntries();
  const agentKey = useAgentKey(options.subject);
  const t = options.t.entries.search;
  const tooLong = queryProblem(state.query) === "tooLong";

  async function ask(event: React.FormEvent) {
    event.preventDefault();

    if (!agentKey || queryProblem(state.query) !== null) {
      return;
    }

    const asked = state.query.trim();
    // The number this answer belongs to. Two searches in flight finish in
    // whatever order they finish in, and the older one must not land.
    const ask = state.asks + 1;

    dispatch({ type: SearchActionType.Asked, data: asked });

    const outcome = await searchEntriesAction(asked, agentKey, options.locale);

    if (outcome.status !== "found") {
      dispatch({ type: SearchActionType.Failed, data: { ask } });

      return;
    }

    // Into the journal before they are shown: the list is what holds entries,
    // and what holds them is what gets them unlocked.
    for (const hit of outcome.hits) {
      entries.dispatch({ type: EntriesActionType.Arrived, data: hit.entry });
    }

    dispatch({ type: SearchActionType.Answered, data: { ask, hits: outcome.hits } });
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 pb-3">
      <form className="flex items-center gap-2" onSubmit={ask}>
        <input
          aria-label={t.open}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-base md:text-xs"
          maxLength={MAX_QUERY_CHARS}
          onChange={(event) => dispatch({ type: SearchActionType.Typed, data: event.target.value })}
          placeholder={t.placeholder}
          type="search"
          value={state.query}
        />
        <button
          aria-label={t.submit}
          className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
          disabled={!agentKey || queryProblem(state.query) !== null}
          type="submit"
        >
          <MagnifyingGlassIcon size={ICON_SIZE} weight="bold" />
        </button>
      </form>
      {tooLong && <p className="text-xs text-accent">{t.tooLong}</p>}
      {/* An answer outlives the entries it names: these are kept while the
          panel is closed, and one thrown away in the meantime is no longer
          something to offer. */}
      <Answer
        hits={state.hits.filter((hit) => !entries.state.discarded.includes(hit.entry.id))}
        locale={options.locale}
        status={state.status}
        t={options.t}
      />
    </div>
  );
}

interface AnswerOptions {
  t: Dictionary;
  locale: Locale;
  status: "idle" | "searching" | "answered" | "failed";
  hits: SearchHit[];
}

function Answer(options: AnswerOptions) {
  const t = options.t.entries.search;

  if (options.status === "idle") {
    return null;
  }

  if (options.status === "failed") {
    return <p className="text-xs text-accent">{t.failed}</p>;
  }

  // The last answer stays up while the next is being worked out, with a line
  // above it, rather than the panel going blank for as long as a model takes.
  return (
    <>
      {options.status === "searching" && <p className="text-xs text-muted">{t.searching}</p>}
      {options.status === "answered" && options.hits.length === 0 && (
        <p className="text-xs text-muted">{t.none}</p>
      )}
      <ul className="flex flex-col gap-1">
        {options.hits.map((hit) => (
          <Hit hit={hit} key={hit.entry.id} locale={options.locale} t={options.t} />
        ))}
      </ul>
    </>
  );
}

function Hit(options: { hit: SearchHit; locale: Locale; t: Dictionary }) {
  const { state } = useEntries();
  const show = useShowEntry();
  const title = state.opened[options.hit.entry.id]?.title ?? options.t.entries.opening;

  return (
    <li>
      <button
        aria-label={options.t.entries.open}
        className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-surface-muted"
        onClick={() => show(options.hit.entry)}
        type="button"
      >
        <p className="truncate text-xs font-medium">{title}</p>
        <p className="text-xs text-muted">{shortDayIn(options.hit.entry.date, options.locale)}</p>
        {/* The one line the model wrote. Everything else on this row was
            unlocked in the browser; this was not. */}
        <p className="mt-0.5 text-xs text-muted italic">{options.hit.why}</p>
      </button>
    </li>
  );
}
