"use client";

/**
 * Whether this browser has been offered a passkey and turned it down.
 *
 * Per device and per person: a phone saying no does not speak for a laptop, and
 * the point of the offer is that each device needs its own credential.
 *
 * Kept here rather than on the profile because it is about this browser, and a
 * browser that will not remember it simply gets asked again — which is the
 * harmless direction to fail in.
 */
const DECLINED = "declined";

function key(subject: string): string {
  return `eetr-journal:passkey-offer:${subject}`;
}

export function passkeyOfferDeclined(subject: string): boolean {
  try {
    return localStorage.getItem(key(subject)) === DECLINED;
  } catch {
    return false;
  }
}

export function declinePasskeyOffer(subject: string): void {
  try {
    localStorage.setItem(key(subject), DECLINED);
  } catch {
    // Private windows and storage-blocking settings land here.
  }
}
