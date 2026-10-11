"use client";

import Image from "next/image";
import { XIcon } from "@phosphor-icons/react";
import { format } from "@/i18n/format";
import type { PickProblem } from "../use_attachments";
import type { Attachment } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 12;
const THUMB_PX = 56;

export interface AttachmentTrayOptions {
  t: Dictionary;
  attachments: Attachment[];
  problem: PickProblem | null;
  maxImages: number;
  onRemove: (index: number) => void;
}

/** What will go with the next message, and why anything did not make it. */
export default function AttachmentTray(options: AttachmentTrayOptions) {
  const t = options.t.images;

  if (options.attachments.length === 0 && !options.problem) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 px-1 pb-2">
      {options.attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {options.attachments.map((attachment, at) => (
            <li className="relative" key={`${attachment.name}-${at}`}>
              <Image
                alt={t.attached}
                className="rounded-md border border-border object-cover"
                height={THUMB_PX}
                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                style={{ height: THUMB_PX, width: THUMB_PX }}
                unoptimized
                width={THUMB_PX}
              />
              <button
                aria-label={t.remove}
                className="absolute -top-1.5 -right-1.5 rounded-full border border-border bg-surface p-0.5 text-muted hover:text-foreground"
                onClick={() => options.onRemove(at)}
                title={t.remove}
                type="button"
              >
                <XIcon size={ICON_SIZE} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {options.problem ? (
        <output className="text-xs text-accent">
          {format(t.problems[options.problem], { max: String(options.maxImages) })}
        </output>
      ) : null}
    </div>
  );
}
