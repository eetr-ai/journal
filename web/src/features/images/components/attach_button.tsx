"use client";

import { useRef } from "react";
import { ImageIcon } from "@phosphor-icons/react";
import { ACCEPTED_TYPES } from "../rules";

const ICON_SIZE = 16;

export interface AttachButtonOptions {
  label: string;
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

/**
 * Picks pictures. Any image the browser can draw is offered, not only the types
 * we send, because the composer re-encodes what it has to.
 */
export default function AttachButton(options: AttachButtonOptions) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        accept={["image/*", ...ACCEPTED_TYPES].join(",")}
        className="hidden"
        multiple
        onChange={(event) => {
          options.onFiles(Array.from(event.target.files ?? []));
          // Cleared so picking the same file again still fires a change.
          event.target.value = "";
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <button
        aria-label={options.label}
        className="pb-1 text-muted hover:text-foreground disabled:opacity-40 disabled:hover:text-muted"
        disabled={options.disabled}
        onClick={() => input.current?.click()}
        title={options.label}
        type="button"
      >
        <ImageIcon size={ICON_SIZE} />
      </button>
    </>
  );
}
