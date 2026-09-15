"use client";

import { useEffect } from "react";
import { EntriesActionType, useEntries } from "./entries_state";

/**
 * Keeps the address bar on whatever the panel is showing, in both directions.
 *
 * The agent can move the reader to an entry mid-conversation, and a move that
 * left no history behind would make back do something else — so the URL is
 * pushed when the panel moves, and the panel follows when the URL moves.
 *
 * `window.history.pushState` rather than the router: the entries are already in
 * the browser, and a navigation would re-render the server's half of the page
 * to arrive at what is on screen.
 */

const PARAM = "entry";

function urlFor(showing: string | null): string {
  const params = new URLSearchParams(window.location.search);

  if (showing) {
    params.set(PARAM, showing);
  } else {
    params.delete(PARAM);
  }

  const query = params.toString();

  return query ? `${window.location.pathname}?${query}` : window.location.pathname;
}

export function useEntryUrl() {
  const { state, dispatch } = useEntries();
  const { showing, entries } = state;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get(PARAM) === showing) {
      return;
    }

    window.history.pushState(null, "", urlFor(showing));
  }, [showing]);

  useEffect(() => {
    function followed() {
      const wanted = new URLSearchParams(window.location.search).get(PARAM);
      const entry = wanted ? entries.find((held) => held.id === wanted) : undefined;

      // An id this page never loaded cannot be shown without going to the
      // server for it, and back is the wrong moment to do that.
      dispatch(
        entry ? { type: EntriesActionType.Shown, data: entry } : { type: EntriesActionType.Closed },
      );
    }

    window.addEventListener("popstate", followed);

    return () => window.removeEventListener("popstate", followed);
  }, [dispatch, entries]);
}
