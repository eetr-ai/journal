/**
 * The page's view lives in two query params — the conversation and the entry —
 * and any link that moves one of them must carry the other through unchanged.
 *
 * Only these two are carried: anything else in the query belonged to where the
 * link was followed from.
 */

const VIEW_PARAMS = ["chat", "entry"] as const;

export type ViewParam = (typeof VIEW_PARAMS)[number];

/** A string sets the param, null drops it, and a param left out is kept. */
export type ViewChanges = Partial<Record<ViewParam, string | null>>;

export function withView(current: URLSearchParams, changes: ViewChanges = {}): URLSearchParams {
  const ret = new URLSearchParams();

  for (const param of VIEW_PARAMS) {
    const value = param in changes ? changes[param] : current.get(param);

    if (value) {
      ret.set(param, value);
    }
  }

  return ret;
}

export function viewHref(
  path: string,
  current: URLSearchParams,
  changes: ViewChanges = {},
): string {
  const query = withView(current, changes).toString();

  return query ? `${path}?${query}` : path;
}
