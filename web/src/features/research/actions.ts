"use server";

import { research } from "./service";
import type { ResearchKind, ResearchOutcome } from "./types";

/** Looking a quote or a song up from the editor. Every rule is the service's. */
export async function researchAction(
  kind: ResearchKind,
  query: string,
  locale: string,
): Promise<ResearchOutcome> {
  return await research(kind, query, locale);
}
