"use client";

import { useSearch } from "../search_state";

export interface CoveredWhileSearchingOptions {
  children: React.ReactNode;
}

/**
 * Takes the panels out of reach while the answer is over them.
 *
 * A cover that only paints over something leaves it there: Tab walks into a
 * composer nobody can see, and Enter sends to it. `inert` is the one thing that
 * says otherwise, and it cannot be set from CSS — so it is driven from the same
 * flag the cover is, which is safe here because the answer covers at every size
 * rather than only at the ones where a panel is a sheet.
 *
 * `contents` so the wrapper is not a box: the three panels stay flex children
 * of the row, and only their reachability changes.
 */
export default function CoveredWhileSearching(options: CoveredWhileSearchingOptions) {
  const { state } = useSearch();

  return (
    <div className="contents" inert={state.status !== "idle"}>
      {options.children}
    </div>
  );
}
