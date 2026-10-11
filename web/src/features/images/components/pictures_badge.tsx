"use client";

import { ImagesIcon } from "@phosphor-icons/react";
import { format } from "@/i18n/format";
import type { ImagesStatus } from "../images_state";
import type { OpenedImage } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface PicturesBadgeOptions {
  t: Dictionary;
  images: OpenedImage[];
  anchored: Set<string>;
  status: ImagesStatus;
  onOpen: () => void;
}

/**
 * How many pictures are kept with the day, and how many of them the words no
 * longer place. Nothing at all when there are none.
 */
export default function PicturesBadge(options: PicturesBadgeOptions) {
  const t = options.t.images;

  if (options.status === "failed") {
    return <p className="mb-3 text-xs text-accent">{t.loadFailed}</p>;
  }

  if (options.images.length === 0) {
    return null;
  }

  const loose = options.images.filter((image) => !options.anchored.has(image.id)).length;
  const count = String(options.images.length);

  return (
    <div className="mb-3 flex justify-end">
      <button
        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={options.onOpen}
        type="button"
      >
        <ImagesIcon size={ICON_SIZE} />
        {options.images.length === 1 ? t.badgeOne : format(t.badgeMany, { count })}
        {loose > 0 ? (
          <span className="text-highlight">{format(t.badgeLoose, { count: String(loose) })}</span>
        ) : null}
      </button>
    </div>
  );
}
