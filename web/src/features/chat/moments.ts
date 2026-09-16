/**
 * When something was said, in the reader's terms.
 *
 * The zone is the one on their profile, because a conversation happened where
 * they are and not where the server is. The locale is the browser's, because
 * that is what they configured their machine to read dates in — which can
 * differ from the language the app is in, and deliberately does.
 *
 * Which locale that is, is decided by the caller and passed in. These are pure
 * so that the same inputs render the same string on the server and in the
 * browser, which is the only way a rendered timestamp can survive hydration.
 *
 * Both are best-effort: an unknown zone or an odd locale falls back rather than
 * throwing, since a timestamp is never worth failing a page over.
 */

const TIME_ONLY = { hour: "numeric", minute: "2-digit" } as const;
const WITH_DAY = {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
} as const;

/** The browser's, or the app's language on the server where there is none. */
export function readerLocale(fallback: string): string {
  return typeof navigator === "undefined" ? fallback : navigator.language || fallback;
}

function format(
  iso: string,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  const at = new Date(iso);

  if (Number.isNaN(at.getTime())) {
    return "";
  }

  try {
    return at.toLocaleString(locale, {
      ...options,
      timeZone: timezone || undefined,
    });
  } catch {
    return at.toLocaleString(locale, options);
  }
}

export interface MomentOptions {
  iso: string;
  timezone: string;
  /** Already resolved. See readerLocale, and where it is safe to call it. */
  locale: string;
}

/** A turn's time. Today's turns need no date; older ones carry one. */
export function turnMoment(options: MomentOptions): string {
  const shape = isToday(options.iso, options.timezone, options.locale) ? TIME_ONLY : WITH_DAY;

  return format(options.iso, options.timezone, options.locale, shape);
}

/** A conversation's time, which is always dated: the drawer spans days. */
export function conversationMoment(options: MomentOptions): string {
  return format(options.iso, options.timezone, options.locale, WITH_DAY);
}

// Compared as rendered dates rather than by arithmetic, so "today" is today in
// the reader's zone and not in the runtime's.
function isToday(iso: string, timezone: string, locale: string): boolean {
  const shape = { year: "numeric", month: "numeric", day: "numeric" } as const;

  try {
    const zone = { ...shape, timeZone: timezone || undefined };

    return (
      new Date(iso).toLocaleDateString(locale, zone) === new Date().toLocaleDateString(locale, zone)
    );
  } catch {
    return (
      new Date(iso).toLocaleDateString(locale, shape) ===
      new Date().toLocaleDateString(locale, shape)
    );
  }
}

// Two minutes. Anything said inside that is the same breath, not a new one.
const SAME_BREATH_MS = 120_000;

/**
 * Whether a turn is the last of a run — the same person, still talking, still
 * roughly now.
 *
 * Only the last one carries a time. Stamping every line of a burst says nothing
 * except the same clock four times, and pushes the words apart for no reason.
 * An unreadable timestamp on either side counts as a break, so the fallback is
 * to show one rather than to swallow it.
 */
export function endsARun(at: string, next?: { from: string; at: string }, from?: string): boolean {
  if (!next || next.from !== from) {
    return true;
  }

  const gap = Date.parse(next.at) - Date.parse(at);

  return Number.isNaN(gap) || Math.abs(gap) > SAME_BREATH_MS;
}
