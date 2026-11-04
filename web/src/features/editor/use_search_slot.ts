"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResearchHit, ResearchOutcome } from "@/features/research/types";
import type { Locale } from "@/i18n/config";
import type { SearchKind } from "./extensions/slots";

/**
 * What a search block is doing: a query being written, a search out, and what
 * came back with one of it picked. A search started under one query and kind
 * lands only if the block still asks for that.
 */

export type SearchStatus = "idle" | "searching" | "found" | "slow" | "failed";

export interface SearchSlotState {
  query: string;
  status: SearchStatus;
  hits: ResearchHit[];
  index: number;
  /** The query and kind `hits` answer, so Enter on them adds rather than searches again. */
  answered: string;
  /** When the search out now started, so the wait can be told apart as it grows. */
  startedAt: number;
}

const START: SearchSlotState = {
  query: "",
  status: "idle",
  hits: [],
  index: 0,
  answered: "",
  startedAt: 0,
};

const FAILED: ResearchOutcome = { kind: "failed" };

// Any answer that is not an outcome is a failure; an abandoned search is never shown.
async function lookUp(ask: object, signal: AbortSignal): Promise<ResearchOutcome> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ask),
    signal,
  });

  return response.ok ? ((await response.json()) as ResearchOutcome) : FAILED;
}

function landed(now: SearchSlotState, outcome: ResearchOutcome): SearchSlotState {
  return outcome.kind === "found"
    ? { ...now, status: "found", hits: outcome.hits }
    : { ...now, status: outcome.kind };
}

export interface SearchSlot {
  state: SearchSlotState;
  type: (query: string) => void;
  search: () => void;
  move: (step: number) => void;
}

function asked(kind: SearchKind, query: string): string {
  return `${kind}:${query.trim()}`;
}

export function useSearchSlot(kind: SearchKind, locale: Locale): SearchSlot {
  const [state, setState] = useState(START);
  const latest = useRef(state);

  useEffect(() => {
    latest.current = state;
  });

  const out = useRef<AbortController | null>(null);

  // A block taken out abandons its search with it.
  useEffect(() => () => out.current?.abort(), []);

  const search = useCallback(() => {
    const { query } = latest.current;
    const question = asked(kind, query);

    if (query.trim() === "") {
      return;
    }

    out.current?.abort();
    const controller = new AbortController();
    out.current = controller;

    setState((now) => ({
      ...now,
      status: "searching",
      hits: [],
      index: 0,
      answered: question,
      startedAt: Date.now(),
    }));
    void lookUp({ kind, query, locale }, controller.signal)
      .catch(() => FAILED)
      .then((outcome) => {
        if (!controller.signal.aborted) {
          setState((now) => (now.answered === question ? landed(now, outcome) : now));
        }
      });
  }, [kind, locale]);

  const type = useCallback((query: string) => setState((now) => ({ ...now, query })), []);

  const move = useCallback(
    (step: number) =>
      setState((now) =>
        now.hits.length === 0
          ? now
          : { ...now, index: (now.index + step + now.hits.length) % now.hits.length },
      ),
    [],
  );

  return { state, type, search, move };
}

/** The hit Enter adds, or null when Enter should search instead. */
export function chosen(state: SearchSlotState, kind: SearchKind): ResearchHit | null {
  const current = state.answered === asked(kind, state.query);

  return current && state.status === "found" ? (state.hits[state.index] ?? null) : null;
}
