"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { viewHref, type ViewChanges } from "./view_url";

/**
 * Hrefs that keep the view the page is on. Follows `history.pushState` as well
 * as navigations, so a link rendered before the reader opened an entry still
 * carries it.
 */
export function useViewHref() {
  const params = useSearchParams();

  return useCallback(
    (path: string, changes?: ViewChanges) =>
      viewHref(path, new URLSearchParams(params.toString()), changes),
    [params],
  );
}
