// A scheme-relative `//host` address leaves the app as surely as a full one.
const ABSOLUTE_WEB = /^(?:https?:)?\/\//i;

/**
 * Whether a link leads off the app. Any absolute web address counts, ours
 * included: the answer has to be the same on the server and in the browser,
 * and only the browser knows which origin it is on.
 */
export function isExternal(href: string | undefined): boolean {
  return Boolean(href && ABSOLUTE_WEB.test(href));
}
