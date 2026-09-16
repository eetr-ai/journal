"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgetConversationAction } from "./actions";
import type { Locale } from "@/i18n/config";

/**
 * Forgetting the conversation on screen, question and all.
 *
 * Not optimistic, unlike throwing an entry away: what is being removed is the
 * thing you are looking at, so there is no row to take out from under you and
 * nothing to put back — either it goes and this leaves, or it stays and says so.
 */
export interface Forgetting {
  asking: boolean;
  failed: boolean;
  ask: () => void;
  cancel: () => void;
  confirm: () => void;
}

export function useForgetting(threadId: string, locale: Locale): Forgetting {
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  async function forget() {
    setAsking(false);
    setFailed(false);

    // Caught rather than trusted to return: the action resolves the session
    // before its own guard, so a signed-out tab rejects here instead of
    // answering false, and a thrown one says nothing to anybody.
    const gone = await forgetConversationAction(threadId).catch(() => false);

    if (!gone) {
      setFailed(true);

      return;
    }

    // This was the open one, so there is nothing left here to read.
    router.push(`/${locale}`);
  }

  return {
    asking,
    failed,
    ask: () => setAsking(true),
    cancel: () => setAsking(false),
    confirm: () => void forget(),
  };
}
