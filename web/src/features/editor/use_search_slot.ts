"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { researchAction } from "@/features/research/actions";
import type { ResearchHit } from "@/features/research/types";
import type { Locale } from "@/i18n/config";
import type { SearchKind } from "./extensions/slots";

/**
 * What a search block is doing: a query being written, a search out, and what
 * came back with one of it picked. A search started under one query and kind
 * lands only if the block still asks for that.
 */

export type SearchStatus = "idle" | "searching" | "found" | "failed";

export interface SearchSlotState {
  query: string;
  status: SearchStatus;
  hits: ResearchHit[];
  index: number;
  /** The query and kind `hits` answer, so Enter on them adds rather than searches again. */
  answered: string;
}

const START: SearchSlotState = { query: "", status: "idle", hits: [], index: 0, answered: "" };

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

  const search = useCallback(() => {
    const question = asked(kind, latest.current.query);

    if (latest.current.query.trim() === "") {
      return;
    }

    setState((now) => ({ ...now, status: "searching", hits: [], index: 0, answered: question }));
    void researchAction(kind, latest.current.query, locale)
      .catch(() => ({ kind: "failed" }) as const)
      .then((outcome) =>
        setState((now) => {
          if (now.answered !== question) {
            return now;
          }

          return outcome.kind === "found"
            ? { ...now, status: "found", hits: outcome.hits }
            : { ...now, status: "failed" };
        }),
      );
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
