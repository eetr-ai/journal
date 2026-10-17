"use client";

import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { readEntryAction, saveEntryAction } from "@/features/entries/actions";
import {
  EntriesActionType,
  useEntries,
  type EntriesAction,
} from "@/features/entries/entries_state";
import { saveProblem } from "@/features/entries/rules";
import type { SaveOutcome } from "@/features/entries/service";
import type { Entry } from "@/features/entries/types";
import { anchoredIn } from "@/features/images/rules";
import { useAgentKey } from "@/features/chat/use_agent_key";
import {
  EditorActionType,
  isDirty,
  useEditorState,
  type EditorAction,
  type EditorState,
} from "./editor_state";

/**
 * Writes the entry back while the reader writes it.
 *
 * A save goes out after a pause in typing, and at least this often while the
 * typing does not pause, so a long burst is never all at risk at once. One is
 * in flight at a time; what was typed meanwhile goes in the next. Each names
 * the version it was opened at, so it lands only on that one.
 */

/** Quiet this long, and what was typed is saved. */
export const PAUSE_MS = 1_500;
/** Typing that never pauses is still saved this often. */
export const MAX_WAIT_MS = 10_000;

const FAILED: SaveOutcome = { status: "failed" };
// Waiting on the reader, or on a save already out: a timer has nothing to add.
const HELD = new Set<EditorState["status"]>(["saving", "failed", "invalid", "stale"]);

export interface EntrySyncOptions {
  entry: Entry;
  subject: string;
  /** The pictures kept with this entry, as far as they have loaded. */
  pictures: ReadonlySet<string>;
}

interface Latest {
  state: EditorState;
  key: string | null;
  options: EntrySyncOptions;
}

interface Attempt {
  state: EditorState;
  key: string;
  options: EntrySyncOptions;
  dispatch: Dispatch<EditorAction>;
  entries: Dispatch<EntriesAction>;
}

// Somebody wrote in between. The newer version is fetched into the journal,
// where the editor finds it and offers it to the reader.
async function fetchNewer(attempt: Attempt): Promise<void> {
  const newer = await readEntryAction(attempt.options.entry.id).catch(() => null);

  if (newer) {
    attempt.entries({ type: EntriesActionType.Arrived, data: newer });
  }
}

function settle(attempt: Attempt, outcome: SaveOutcome): void {
  const { title, markdown } = attempt.state.present;

  switch (outcome.status) {
    case "saved":
      attempt.dispatch({
        type: EditorActionType.Saved,
        data: { title, markdown, version: outcome.entry.version },
      });
      attempt.entries({
        type: EntriesActionType.Saved,
        data: { entry: outcome.entry, opened: { title, content: markdown } },
      });
      return;
    case "stale":
      attempt.dispatch({ type: EditorActionType.SaveStale });
      void fetchNewer(attempt);
      return;
    case "invalid":
      attempt.dispatch({ type: EditorActionType.Rejected, data: outcome.problem });
      return;
    default:
      attempt.dispatch({ type: EditorActionType.SaveFailed });
  }
}

async function send(attempt: Attempt): Promise<SaveOutcome | null> {
  const { state, options } = attempt;
  const words = { title: state.present.title, content: state.present.markdown };
  // Anchors already stored stand while their pictures are still loading.
  const pictures = new Set([...anchoredIn(state.saved.markdown), ...options.pictures]);
  const problem = saveProblem(words, pictures);

  if (problem) {
    attempt.dispatch({ type: EditorActionType.Rejected, data: problem });
    return null;
  }

  attempt.dispatch({ type: EditorActionType.SaveStarted });
  const save = {
    ...words,
    id: options.entry.id,
    date: options.entry.date,
    version: state.saved.version,
  };
  const outcome = await saveEntryAction(save, attempt.key).catch(() => FAILED);
  settle(attempt, outcome);
  return outcome;
}

// The version a save landed, carried into what the next flush reads. Once the
// editor has unmounted nothing renders again to put it there.
function landed(now: Latest, attempt: Attempt, version: number): Latest {
  const { title, markdown } = attempt.state.present;

  return { ...now, state: { ...now.state, saved: { title, markdown, version } } };
}

export function useEntrySync(options: EntrySyncOptions): { flush: () => void } {
  const { state, dispatch } = useEditorState();
  const entries = useEntries().dispatch;
  const key = useAgentKey(options.subject);
  const latest = useRef<Latest>({ state, key, options });
  const sending = useRef(false);
  // A flush asked for while a save was out, which goes once that one settles.
  const queued = useRef(false);
  const dirtySince = useRef<number | null>(null);

  useEffect(() => {
    latest.current = { state, key, options };
  });

  const flush = useCallback(
    function flush() {
      const now = latest.current;

      if (!now.key || !isDirty(now.state) || now.state.incoming) {
        return;
      }
      if (sending.current) {
        queued.current = true;
        return;
      }

      sending.current = true;
      dirtySince.current = null;
      const attempt = { ...now, key: now.key, dispatch, entries };
      void send(attempt)
        .catch(() => null)
        .then((outcome) => {
          sending.current = false;
          const again = queued.current && outcome?.status === "saved";
          queued.current = false;
          if (again) {
            latest.current = landed(latest.current, attempt, outcome.entry.version);
            flush();
          }
        });
    },
    [dispatch, entries],
  );

  const dirty = isDirty(state);
  const held = HELD.has(state.status) || state.incoming !== null;
  // Zero after an undo or a load, which then saves straight away.
  const typedAt = state.lastTyped?.at ?? 0;

  useEffect(() => {
    if (!dirty || held) {
      return;
    }

    const now = Date.now();
    dirtySince.current ??= now;
    const pause = PAUSE_MS - (now - typedAt);
    const left = MAX_WAIT_MS - (now - dirtySince.current);
    const timer = window.setTimeout(flush, Math.max(0, Math.min(pause, left)));

    return () => window.clearTimeout(timer);
  }, [dirty, held, flush, typedAt]);

  useFlushWhenLeaving(flush);

  return { flush };
}

// A tab going to the background may never come back, and an entry switched
// away from unmounts this. What was typed goes before either.
function useFlushWhenLeaving(flush: () => void): void {
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    document.addEventListener("visibilitychange", hidden);

    return () => {
      document.removeEventListener("visibilitychange", hidden);
      flush();
    };
  }, [flush]);
}
