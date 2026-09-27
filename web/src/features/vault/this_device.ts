"use client";

/**
 * Which enrolled passkey this browser opens the vault with.
 *
 * Advisory only: the server's list is what can open the vault, and this is a
 * note beside it so the list can say "this device" and a reset knows what it
 * replaces. A browser that will not keep it just shows no marker.
 */

function key(subject: string): string {
  return `eetr-journal:this-device-passkey:${subject}`;
}

export function thisDeviceCredential(subject: string): string | null {
  try {
    return localStorage.getItem(key(subject));
  } catch {
    return null;
  }
}

export function rememberThisDevice(subject: string, credentialId: string): void {
  try {
    localStorage.setItem(key(subject), credentialId);
  } catch {
    // Private windows and storage-blocking settings land here.
  }
}

export function forgetThisDevice(subject: string): void {
  try {
    localStorage.removeItem(key(subject));
  } catch {
    // As above: nothing was kept, so there is nothing to forget.
  }
}
