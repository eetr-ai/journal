/**
 * The time zones this runtime knows, with `current` guaranteed to be among them
 * so a stored value never disappears from the picker just because the browser's
 * database is older than the one that wrote it.
 */
export function timezoneOptions(current: string): string[] {
  const supported = Intl.supportedValuesOf("timeZone");

  if (current === "" || supported.includes(current)) {
    return supported;
  }

  return [current, ...supported];
}

/** The zone the browser is in, for a profile that has never chosen one. */
export function detectedTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
