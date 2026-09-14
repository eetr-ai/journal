"use server";

import { revalidatePath } from "next/cache";
import { forget } from "./service";

/** Erase one conversation, and refresh the drawer that listed it. */
export async function forgetConversationAction(threadId: string): Promise<boolean> {
  const done = await forget(threadId);

  if (done) {
    revalidatePath("/", "layout");
  }

  return done;
}
