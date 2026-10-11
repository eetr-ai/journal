"use client";

import Image from "next/image";
import { ImageBrokenIcon } from "@phosphor-icons/react";
import type { OpenedImage } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface InlinePictureOptions {
  t: Dictionary;
  /** The anchored picture, or undefined when nothing kept matches the anchor. */
  image?: OpenedImage;
  alt: string;
  loading: boolean;
}

/**
 * A picture where the words place it. An anchor that names nothing kept is
 * drawn as nothing once the pictures have loaded: the words still read.
 */
export default function InlinePicture(options: InlinePictureOptions) {
  const t = options.t.images;

  if (!options.image) {
    return options.loading ? <span className="block text-xs text-muted">{t.opening}</span> : null;
  }

  if (!options.image.src) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted">
        <ImageBrokenIcon size={ICON_SIZE} />
        {t.unreadable}
      </span>
    );
  }

  // A data URL opened in this browser: nothing to fetch or optimise, and its
  // size is only known once drawn. CSS sizes it rather than the attributes: its
  // own size, shrunk to the column when it is wider, never stretched.
  return (
    <Image
      alt={options.alt || options.image.caption || t.attached}
      className="my-3 h-auto w-auto max-w-full rounded-lg border border-border"
      height={0}
      sizes="100vw"
      src={options.image.src}
      unoptimized
      width={0}
    />
  );
}
