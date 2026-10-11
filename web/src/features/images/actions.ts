"use server";

import { deleteImage, entryImages, type ImagesOutcome } from "./service";

/**
 * An entry's pictures, sealed, as the browser reaches them. No key travels on
 * this call: the browser opens what comes back.
 */
export async function entryImagesAction(entryId: string): Promise<ImagesOutcome> {
  return entryImages(entryId);
}

/** Throw a picture away. False when it could not be, so the panel can say so. */
export async function deleteImageAction(entryId: string, imageId: string): Promise<boolean> {
  return deleteImage(entryId, imageId);
}
