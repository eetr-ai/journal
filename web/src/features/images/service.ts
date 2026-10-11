import "server-only";
import { auth } from "@/auth";
import { imagesClient } from "./client";
import { maxImages } from "./config";
import type { EntryImage, ImagesView } from "./types";

/**
 * The rules the BFF owns between the session and the agent. The subject always
 * comes from the session; nothing here takes one from a caller.
 */

// Minted in the browser with crypto.randomUUID().
const ENTRY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export type ImagesOutcome = { kind: "found"; images: EntryImage[] } | { kind: "failed" };

export async function entryImages(entryId: string): Promise<ImagesOutcome> {
  const subject = (await auth())?.user?.subject;

  if (!subject || !ENTRY_ID.test(entryId)) {
    return { kind: "found", images: [] };
  }

  try {
    return { kind: "found", images: await imagesClient.forEntry(subject, entryId) };
  } catch (error) {
    console.error("[images] could not list an entry's pictures", error);

    return { kind: "failed" };
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
