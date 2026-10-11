import type { AcceptedType } from "./rules";

/**
 * A picture, on both sides of the agent boundary.
 *
 * The agent answers in the shape its SQL produced, so the snake_case entity
 * lives here beside the domain type and the mapper between them.
 */

/**
 * A picture on its way to the model, on the body of the message it goes with.
 * `data` is plain base64, never a data URL. Never log one.
 */
export interface Attachment {
  mimeType: AcceptedType;
  name: string;
  data: string;
}

/** A picture kept with an entry, as stored: `caption` and `data` are sealed. */
export interface EntryImage {
  id: string;
  entryId: string;
  ordinal: number;
  mimeType: string;
  caption: string;
  data: string;
}

export interface EntryImageEntity {
  id: string;
  entry_id: string;
  ordinal: number;
  mime_type: string;
  caption: string;
  data: string;
  created_at: string;
}

export interface EntryImagesEntity {
  images: EntryImageEntity[];
}

/** What the key made of one. `src` is null when the key would not open it. */
export interface OpenedImage {
  id: string;
  src: string | null;
  caption: string;
}

/** What the composer is allowed to offer, decided on the server once per page. */
export interface ImagesView {
  allowed: boolean;
  maxImages: number;
}

/** What the chat model can be handed besides words. */
export interface Capabilities {
  images: boolean;
}

export function imageFromEntity(entity: EntryImageEntity): EntryImage {
  return {
    id: entity.id,
    entryId: entity.entry_id,
    ordinal: entity.ordinal,
    mimeType: entity.mime_type,
    caption: entity.caption,
    data: entity.data,
  };
}
