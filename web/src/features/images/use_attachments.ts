"use client";

import { useCallback, useRef, useState } from "react";
import { prepared, type Prepared } from "./prepare";
import type { AttachmentProblem } from "./rules";
import type { Attachment } from "./types";

export type PickProblem = AttachmentProblem | "unreadable" | "busy";

/** The pictures on a clipboard or a drop, ignoring anything else on it. */
export function picturesIn(data: DataTransfer): File[] {
  return Array.from(data.files).filter((file) => file.type.startsWith("image/"));
}

/** Why a pick did not all make it: too many first, then the first refusal. */
function problemOf(overflowed: boolean, results: Prepared[]): PickProblem | null {
  if (overflowed) {
    return "tooMany";
  }

  for (const result of results) {
    if ("problem" in result) {
      return result.problem;
    }
  }

  return null;
}

/**
 * The pictures waiting to go with the next message.
 *
 * useState: this owns nothing beyond the composer it sits in. Pictures past the
 * limit are dropped from the end and the person is told, rather than the whole
 * pick being refused over the last one.
 */
export function useAttachments(maxImages: number) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [problem, setProblem] = useState<PickProblem | null>(null);
  // Places taken, counting picks still being prepared. Reserved before the
  // wait, so two picks in quick succession cannot both see the same room.
  const taken = useRef(0);

  const add = useCallback(
    async (files: File[]) => {
      const room = Math.max(0, maxImages - taken.current);
      const reserved = Math.min(files.length, room);
      taken.current += reserved;

      const results = await Promise.all(files.slice(0, reserved).map(prepared));
      const added = results.flatMap((result) =>
        "attachment" in result ? [result.attachment] : [],
      );

      // A picture that could not be prepared gives its place back.
      taken.current -= reserved - added.length;
      setAttachments((current) => [...current, ...added]);
      setProblem(problemOf(files.length > room, results));
    },
    [maxImages],
  );

  const remove = useCallback((index: number) => {
    taken.current = Math.max(0, taken.current - 1);
    setAttachments((current) => current.filter((_, at) => at !== index));
    setProblem(null);
  }, []);

  const clear = useCallback(() => {
    taken.current = 0;
    setAttachments([]);
    setProblem(null);
  }, []);

  return { attachments, problem, add, remove, clear, refuse: setProblem };
}
