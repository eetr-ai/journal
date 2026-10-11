"use client";

import { MAX_IMAGE_BYTES, MAX_NAME_CHARS, isAcceptedType, type AttachmentProblem } from "./rules";
import type { Attachment } from "./types";

/**
 * A picture the person picked, made into something worth sending.
 *
 * Shrunk in the browser, so a phone photo costs a few hundred kilobytes on the
 * wire and in the database rather than its full size. A picture already small
 * enough is sent as it is. Anything shrunk is re-encoded as JPEG, the one lossy
 * format every browser can write; transparency is flattened onto white.
 */

// The long edge. Past this a model reads no more detail than it already has.
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.85;
const OUTPUT_TYPE = "image/jpeg";

export type Prepared = { attachment: Attachment } | { problem: AttachmentProblem | "unreadable" };

function readBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

async function shrunk(bitmap: ImageBitmap, scale: number): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => canvas.toBlob(resolve, OUTPUT_TYPE, JPEG_QUALITY));
}

/** The blob to send and its type, or null when the browser could not draw it. */
async function encoded(file: File): Promise<{ blob: Blob; type: string } | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);

  if (!bitmap) {
    return null;
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));

  if (scale === 1 && file.size <= MAX_IMAGE_BYTES && isAcceptedType(file.type)) {
    bitmap.close();

    return { blob: file, type: file.type };
  }

  const blob = await shrunk(bitmap, scale);
  bitmap.close();

  return blob ? { blob, type: OUTPUT_TYPE } : null;
}

export async function prepared(file: File): Promise<Prepared> {
  // Anything the browser can draw is accepted here, because it leaves as JPEG.
  if (!file.type.startsWith("image/")) {
    return { problem: "type" };
  }

  const result = await encoded(file);

  if (!result || !isAcceptedType(result.type)) {
    return { problem: "unreadable" };
  }

  if (result.blob.size > MAX_IMAGE_BYTES) {
    return { problem: "tooLarge" };
  }

  return {
    attachment: {
      mimeType: result.type,
      name: file.name.slice(0, MAX_NAME_CHARS),
      data: await readBase64(result.blob),
    },
  };
}
