import "server-only";
import { auth } from "@/auth";
import { imagesClient } from "./client";
import { maxImages } from "./config";
import type { EntryImage, ImagesView } from "./types";

/**
 * The rules the BFF owns between the session and the agent. The subject always
 * comes from the session; nothing here takes one from a caller.
 */

// Minted in the browser with crypto.randomUUID(), or by Postgres; the same shape.
const MINTED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export type ImagesOutcome = { kind: "found"; images: EntryImage[] } | { kind: "failed" };

export async function entryImages(entryId: string): Promise<ImagesOutcome> {
  const subject = (await auth())?.user?.subject;

  if (!subject || !MINTED_ID.test(entryId)) {
    return { kind: "found", images: [] };
  }

  try {
    return { kind: "found", images: await imagesClient.forEntry(subject, entryId) };
  } catch (error) {
    console.error("[images] could not list an entry's pictures", error);

    return { kind: "failed" };
  }
}

/**
 * Throw a picture away. The browser decides it is unanchored, because only the
 * browser can read the words that would anchor it; the server only makes sure
 * it is this person's.
 */
export async function deleteImage(entryId: string, imageId: string): Promise<boolean> {
  const subject = (await auth())?.user?.subject;

  if (!subject || !MINTED_ID.test(entryId) || !MINTED_ID.test(imageId)) {
    return false;
  }

  try {
    return await imagesClient.remove(subject, entryId, imageId);
  } catch (error) {
    console.error("[images] could not delete a picture", error);

    return false;
  }
}

export async function imagesView(): Promise<ImagesView> {
  try {
    const capabilities = await imagesClient.capabilities();

    return { allowed: capabilities.images, maxImages: maxImages() };
  } catch {
    return { allowed: false, maxImages: maxImages() };
  }
}
