"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { prepared } from "@/features/images/prepare";
import type { OpenedImage, PictureAdd } from "@/features/images/types";
import { fillSlot, markSlot, pictureSlot } from "./extensions/slots";

/**
 * Pictures the reader puts into an entry. Each is held by a slot while it is
 * shrunk, sealed and stored, and only then becomes the picture's anchor: the
 * words never name a picture the entry does not have yet.
 */

export type UploadProblem = "type" | "tooLarge" | "tooMany" | "unreadable" | "unsaved" | "failed";

export interface PictureUploadOptions {
  entryId: string;
  key: string | null;
  /** Makes sure the entry is stored, which a picture needs first. True when it is. */
  store: () => Promise<boolean>;
  /** Told the moment a picture is stored, before its anchor is placed. */
  kept: (id: string) => void;
  onAdded: (image: OpenedImage) => void;
}

export interface PictureUpload {
  /** Puts these files into the slot already holding their place. */
  fill: (editor: Editor, files: File[], token: string) => void;
  /** Places a slot for each file at `at`, then fills them. */
  place: (editor: Editor, files: File[], at: number) => void;
}

// The stored picture's id, or null for any answer but a stored picture.
async function stored(entryId: string, add: PictureAdd): Promise<string | null> {
  const response = await fetch(`/api/entries/${encodeURIComponent(entryId)}/images`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(add),
  }).catch(() => null);
  const answer = response?.ok
    ? ((await response.json().catch(() => null)) as { id?: unknown })
    : null;

  return typeof answer?.id === "string" ? answer.id : null;
}

function failed(editor: Editor, token: string, problem: UploadProblem): void {
  markSlot(editor, token, { status: "failed", problem });
}

async function upload(editor: Editor, file: File, token: string, options: PictureUploadOptions) {
  markSlot(editor, token, { status: "uploading", problem: "" });
  const ready = await prepared(file);

  if ("problem" in ready) {
    return failed(editor, token, ready.problem);
  }
  if (!options.key || !(await options.store())) {
    return failed(editor, token, "unsaved");
  }

  const { mimeType, data } = ready.attachment;
  const id = await stored(options.entryId, { key: options.key, picture: ready.attachment });

  if (!id) {
    return failed(editor, token, "failed");
  }

  options.kept(id);
  options.onAdded({ id, src: `data:${mimeType};base64,${data}`, caption: "" });
  fillSlot(editor, token, id);
}

// One at a time, so a draft is stored once rather than raced into twice.
async function uploadAll(editor: Editor, pairs: [File, string][], options: PictureUploadOptions) {
  for (const [file, token] of pairs) {
    await upload(editor, file, token, options).catch(() => failed(editor, token, "failed"));
  }
}

export function usePictureUpload(options: PictureUploadOptions): PictureUpload {
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  const fill = useCallback((editor: Editor, files: File[], token: string) => {
    if (files[0]) {
      void uploadAll(editor, [[files[0], token]], latest.current);
    }
  }, []);

  const place = useCallback((editor: Editor, files: File[], at: number) => {
    const pairs = files.map((file): [File, string] => [file, crypto.randomUUID()]);
    const slots = pairs.map(([, token]) => pictureSlot(token, "uploading"));

    editor.chain().focus().insertContentAt(at, slots).run();
    void uploadAll(editor, pairs, latest.current);
  }, []);

  return { fill, place };
}
