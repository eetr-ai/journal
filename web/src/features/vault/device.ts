"use client";

/** A name for the thing holding the passkey, so a list of them means something. */
export function deviceLabel(): string {
  return navigator.platform || "This device";
}
