import "server-only";
import { DEFAULT_MAX_IMAGES } from "./rules";

/**
 * How many pictures one message may carry, from MAX_CHAT_IMAGES.
 *
 * A value that is not a positive whole number falls back to the default and
 * says so in the log, rather than refusing every picture over a typo.
 */
export function maxImages(): number {
  const raw = process.env.MAX_CHAT_IMAGES;

  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_MAX_IMAGES;
  }

  const parsed = Number(raw);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  console.warn("[images] MAX_CHAT_IMAGES is not a positive integer; using the default");

  return DEFAULT_MAX_IMAGES;
}
