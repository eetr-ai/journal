/** What a field points `aria-describedby` at: its error if it has one, else its
 *  hint. The two are never shown together, so the description is never stale. */
export function describedBy(id: string, options: { hint?: string; error?: string }) {
  if (options.error) {
    return `${id}-error`;
  }

  return options.hint ? `${id}-hint` : undefined;
}
