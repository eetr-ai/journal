"use client";

/**
 * Whether this browser has answered the offer of a passkey, either way.
 *
 * Taking one settles the question as firmly as refusing it: enrolling does not
 * change what the browser can do, so nothing else here would stop the offer
 * coming back on the next password unlock.
 *
 * Per device and per person: a phone answering does not speak for a laptop, and
 * the point of the offer is that each device needs its own credential.
 *
 * Kept here rather than on the profile because it is about this browser, and a
 * browser that will not remember it simply gets asked again — which is the
 * harmless direction to fail in.
 */
const ANSWERED = "answered";

function key(subject: string): string {
  return `eetr-journal:passkey-offer:${subject}`;
}

export function passkeyOfferAnswered(subject: string): boolean {
  try {
    return localStorage.getItem(key(subject)) === ANSWERED;
  } catch {
    return false;
  }
}

export function answerPasskeyOffer(subject: string): void {
  try {
    localStorage.setItem(key(subject), ANSWERED);
  } catch {
    // Private windows and storage-blocking settings land here.
  }
}
