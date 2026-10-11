"use client";

import Image from "next/image";
import { ImageBrokenIcon, TrashIcon } from "@phosphor-icons/react";
import type { OpenedImage } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface PictureTileOptions {
  t: Dictionary;
  image: OpenedImage;
  /** Whether the words place it; null while they have not been read. */
  anchored: boolean | null;
  confirming: boolean;
  deleting: boolean;
  onView: () => void;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * One picture in the dialog. Only a picture the words no longer place can be
 * thrown away from here: an anchored one is part of the entry, and goes when
 * the entry does.
 */
export default function PictureTile(options: PictureTileOptions) {
  const t = options.t.images;

  return (
    <li className="flex flex-col gap-1">
      <button
        aria-label={t.view}
        className="relative aspect-square overflow-hidden rounded-lg border border-border"
        onClick={options.onView}
        type="button"
      >
        {options.image.src ? (
          <Image
            alt={options.image.caption || t.attached}
            className="object-cover"
            fill
            sizes="33vw"
            src={options.image.src}
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted">
            <ImageBrokenIcon size={ICON_SIZE} />
          </span>
        )}
      </button>
      {options.anchored === false ? <LooseActions {...options} /> : null}
      {options.anchored ? <span className="text-xs text-muted">{t.inEntry}</span> : null}
    </li>
  );
}

// Two presses, the second in the place the first was, so a stray tap on a
// picture somebody kept on purpose cannot throw it away.
function LooseActions(options: PictureTileOptions) {
  const t = options.t.images;

  if (options.confirming) {
    return (
      <span className="flex gap-1 text-xs">
        <button
          className="rounded px-1.5 py-0.5 hover:bg-surface-muted"
          onClick={options.onCancel}
          type="button"
        >
          {t.keep}
        </button>
        <button
          className="rounded bg-accent px-1.5 py-0.5 text-on-accent hover:opacity-90"
          onClick={options.onConfirm}
          type="button"
        >
          {t.deleteConfirm}
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-between text-xs text-highlight">
      {t.loose}
      <button
        aria-label={t.delete}
        className="rounded p-0.5 text-muted hover:bg-surface-muted hover:text-accent disabled:opacity-40"
        disabled={options.deleting}
        onClick={options.onAsk}
        title={t.delete}
        type="button"
      >
        <TrashIcon size={ICON_SIZE} />
      </button>
    </span>
  );
}
