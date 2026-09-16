"use client";

import { useAgentKey } from "@/features/chat/use_agent_key";
import { EntriesActionType, useEntries } from "./entries_state";
import { SearchActionType, useSearch } from "./search_state";
import { searchEntriesAction } from "./actions";
import { queryProblem } from "./rules";
import type { Locale } from "@/i18n/config";

/**
 * Asking the journal a question.
 *
 * The key goes with the question, because the entries have to be opened to be
 * ranked and this browser is the only thing that can open them. What comes back
 * is sealed again, so the hits are folded into the entries list and decrypted
 * by the same effect that decrypts everything else.
 */
export function useAsking(locale: Locale, subject: string) {
  const { state, dispatch } = useSearch();
  const entries = useEntries();
  const agentKey = useAgentKey(subject);

  async function run(question: string) {
    const asked = question.trim();

    if (!agentKey || queryProblem(asked) !== null) {
      return;
    }

    // The number this answer belongs to. Two searches in flight finish in
    // whatever order they finish in, and the older one must not land.
    const ask = state.asks + 1;

    dispatch({ type: SearchActionType.Asked, data: asked });

    // Caught rather than trusted to return: the action settles the session
    // before its own guard, so a signed-out tab rejects here instead of
    // answering, and the panel would sit reading forever.
    const outcome = await searchEntriesAction(asked, agentKey, locale).catch(
      () => ({ status: "failed" }) as const,
    );

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

  return (question: string) => void run(question);
}
