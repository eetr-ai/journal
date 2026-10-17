import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import {
  imageFromEntity,
  type Capabilities,
  type EntryImage,
  type EntryImagesEntity,
  type PictureAdd,
} from "./types";

/**
 * The only thing in the app that knows how pictures are stored, and how to ask
 * what the chat model can read.
 *
 * Nothing here decrypts, and nothing here could: what comes back is sealed, and
 * the key never reaches this side.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
const REQUEST_TIMEOUT_MS = 5_000;
// A page of pictures is megabytes, not the kilobytes of an entry list.
const IMAGES_TIMEOUT_MS = 30_000;
const ATTEMPTS = 2;
const NOT_FOUND = 404;

let client: RestClient | undefined;

function agent(): RestClient {
  client ??= new RestClient({
    baseUrl: process.env.AGENT_URL ?? DEFAULT_AGENT_URL,
    timeoutMs: REQUEST_TIMEOUT_MS,
    retry: { attempts: ATTEMPTS },
    defaultInit: { cache: "no-store" },
  });

  return client;
}

export const imagesClient = {
  /** An entry's pictures, in order, sealed. None is an ordinary answer. */
  async forEntry(subject: string, entryId: string): Promise<EntryImage[]> {
    const response = await agent().get<EntryImagesEntity>(
      `/entries/${encodeURIComponent(subject)}/${encodeURIComponent(entryId)}/images`,
      { timeoutMs: IMAGES_TIMEOUT_MS },
    );

    return response.getOrThrow().images.map(imageFromEntity);
  },

  /**
   * Keep a picture with an entry, sealed by the agent under the key. Null when
   * the entry is not this person's, or not there.
   */
  async add(subject: string, entryId: string, add: PictureAdd): Promise<string | null> {
    const response = await agent().post<{ added: boolean; id?: string }>(
      `/entries/${encodeURIComponent(subject)}/${encodeURIComponent(entryId)}/images`,
      {
        key: add.key,
        mimeType: add.picture.mimeType,
        data: add.picture.data,
        caption: "",
      },
      { timeoutMs: IMAGES_TIMEOUT_MS, retry: { attempts: 1 } },
    );

    if (response.status === NOT_FOUND) {
      return null;
    }

    return response.getOrThrow().id ?? null;
  },

  /** Throw one away. False when it named nothing of this person's. */
  async remove(subject: string, entryId: string, imageId: string): Promise<boolean> {
    const response = await agent().delete<{ deleted: boolean }>(
      `/entries/${encodeURIComponent(subject)}/${encodeURIComponent(entryId)}/images/${encodeURIComponent(imageId)}`,
    );

    return response.getOrThrow().deleted;
  },

  /**
   * Whether the chat model reads pictures. Any failure is "no": offering one to
   * a model that cannot read it fails mid-conversation, and not offering costs
   * nothing.
   */
  async capabilities(): Promise<Capabilities> {
    const response = await agent().get<Capabilities>("/capabilities");

    return { images: response.ok && response.getOrThrow().images === true };
  },
};
