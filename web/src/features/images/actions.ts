"use server";

import { entryImages, type ImagesOutcome } from "./service";

/**
 * An entry's pictures, sealed, as the browser reaches them. No key travels on
 * this call: the browser opens what comes back.
 */
export async function entryImagesAction(entryId: string): Promise<ImagesOutcome> {
  return entryImages(entryId);
}
