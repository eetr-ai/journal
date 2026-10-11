"use client";

import { useCallback, useState } from "react";
import { prepared, type Prepared } from "./prepare";
import type { AttachmentProblem } from "./rules";
import type { Attachment } from "./types";

export type PickProblem = AttachmentProblem | "unreadable" | "busy";

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

  const add = useCallback(
    async (files: File[]) => {
      const room = Math.max(0, maxImages - attachments.length);
      const results = await Promise.all(files.slice(0, room).map(prepared));
      const added = results.flatMap((result) =>
        "attachment" in result ? [result.attachment] : [],
      );

      setAttachments((current) => [...current, ...added].slice(0, maxImages));
      setProblem(problemOf(files.length > room, results));
    },
    [attachments.length, maxImages],
  );

  const remove = useCallback((index: number) => {
    setAttachments((current) => current.filter((_, at) => at !== index));
    setProblem(null);
  }, []);

  const clear = useCallback(() => {
    setAttachments([]);
    setProblem(null);
  }, []);

  return { attachments, problem, add, remove, clear, refuse: setProblem };
}
