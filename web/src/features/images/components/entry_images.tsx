"use client";

import Image from "next/image";
import { ImageBrokenIcon } from "@phosphor-icons/react";
import { useEntryImages } from "../use_entry_images";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 20;

export interface EntryImagesOptions {
  t: Dictionary;
  subject: string;
  entryId: string | null;
  revision: number;
}

/** The pictures kept with the entry on screen, under its words. */
export default function EntryImages(options: EntryImagesOptions) {
  const state = useEntryImages({
    subject: options.subject,
    entryId: options.entryId,
    revision: options.revision,
  });
  const t = options.t.images;

  if (state.status === "failed") {
    return <p className="mt-4 text-xs text-accent">{t.loadFailed}</p>;
  }

  if (state.images.length === 0) {
    return state.status === "loading" ? (
      <p className="mt-4 text-xs text-muted">{t.opening}</p>
    ) : null;
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-2">
      {state.images.map((image) => (
        <li key={image.id}>
          {image.src ? (
            <figure>
              {/* A data URL opened in this browser: there is nothing to fetch
                  or optimise, so it is passed through as it is. */}
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <Image
                  alt={image.caption || t.attached}
                  className="object-cover"
                  fill
                  sizes="50vw"
                  src={image.src}
                  unoptimized
                />
              </div>
              {image.caption ? (
                <figcaption className="mt-1 text-xs text-muted">{image.caption}</figcaption>
              ) : null}
            </figure>
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-border p-2 text-center text-xs text-muted">
              <ImageBrokenIcon size={ICON_SIZE} />
              {t.unreadable}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
