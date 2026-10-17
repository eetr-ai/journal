import { isAgentKey } from "@/features/vault/rules";
import type { Attachment, PictureAdd } from "./types";

/**
 * Every rule about what a picture may be, in one place the composer and the
 * route both call, so the two can never disagree. The agent judges none of it.
 *
 * The count is a parameter rather than a constant: it is deployment
 * configuration, read on the server and handed to the browser with the page.
 */

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

/** Per picture, decoded, after the browser has shrunk it. */
export const MAX_IMAGE_BYTES = 4_194_304;

export const DEFAULT_MAX_IMAGES = 5;

// A filename is shown to the model and nothing else; long ones are not names.
export const MAX_NAME_CHARS = 200;

// Base64 is written in groups of four characters, three bytes to a group.
const BASE64_GROUP = 4;
const BYTES_PER_GROUP = 3;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/u;

// Room for the words, ids and key around the pictures on a chat body.
const ENVELOPE_BYTES = 65_536;

export type AttachmentProblem = "type" | "tooLarge" | "tooMany";

/** The largest chat body that could be valid with this many pictures on it. */
export function maxBodyBytes(maxImages: number): number {
  const perImage = Math.ceil(MAX_IMAGE_BYTES / BYTES_PER_GROUP) * BASE64_GROUP;

  return maxImages * perImage + ENVELOPE_BYTES;
}

export function isAcceptedType(value: unknown): value is AcceptedType {
  return ACCEPTED_TYPES.includes(value as AcceptedType);
}

/** How many bytes a base64 string decodes to, without decoding it. */
export function decodedBytes(base64: string): number {
  const padding = base64.length - base64.replace(/=+$/u, "").length;

  return (base64.length / BASE64_GROUP) * BYTES_PER_GROUP - padding;
}

export function attachmentProblem(
  attachments: Attachment[],
  maxImages: number,
): AttachmentProblem | null {
  if (attachments.length > maxImages) {
    return "tooMany";
  }

  if (attachments.some((attachment) => !isAcceptedType(attachment.mimeType))) {
    return "type";
  }

  return attachments.some((attachment) => decodedBytes(attachment.data) > MAX_IMAGE_BYTES)
    ? "tooLarge"
    : null;
}

function isAttachment(value: unknown): value is Attachment {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isAcceptedType(candidate.mimeType) &&
    typeof candidate.name === "string" &&
    candidate.name.length <= MAX_NAME_CHARS &&
    typeof candidate.data === "string" &&
    candidate.data !== "" &&
    candidate.data.length % BASE64_GROUP === 0 &&
    BASE64.test(candidate.data)
  );
}

/**
 * The pictures on a posted body, an empty list when there are none, or null
 * when what is there is not something we would send ourselves.
 *
 * Total: it takes `unknown` because what arrives at a route handler is unknown.
 */
export function attachmentsFrom(value: unknown, maxImages: number): Attachment[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every(isAttachment)) {
    return null;
  }

  const attachments = value.map((item) => ({
    mimeType: item.mimeType,
    name: item.name,
    data: item.data,
  }));

  return attachmentProblem(attachments, maxImages) ? null : attachments;
}

/**
 * A picture the reader is adding to an entry, as it may be sent, or null when
 * it is not one we would send ourselves. One picture, so one picture's body.
 */
export function pictureAddFrom(value: unknown): PictureAdd | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const pictures = attachmentsFrom([candidate.picture], 1);

  if (typeof candidate.key !== "string" || !isAgentKey(candidate.key) || !pictures) {
    return null;
  }

  return { key: candidate.key, picture: pictures[0] };
}

/**
 * How an entry places a picture in its words: `![caption](image:<id>)`. The id
 * is the row's, so an anchor names exactly one picture.
 */
export const IMAGE_SCHEME = "image:";

const ANCHOR = /\]\(image:([0-9a-f-]{36})\)/gu;

/** The pictures an entry's words place in it, by id. */
export function anchoredIn(content: string): Set<string> {
  return new Set(Array.from(content.matchAll(ANCHOR), (match) => match[1]));
}

/** The picture id an anchor's URL names, or null when it is any other URL. */
export function anchoredId(url: string): string | null {
  return url.startsWith(IMAGE_SCHEME) ? url.slice(IMAGE_SCHEME.length) : null;
}
