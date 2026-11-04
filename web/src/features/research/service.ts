import "server-only";
import { HttpError, TimeoutError } from "@eetr/ts-rest-utils";
import { auth } from "@/auth";
import { researchClient } from "./client";
import { quoteHits, researchFrom, songHits } from "./rules";
import type { ResearchOutcome } from "./types";

/**
 * Looking a quote or a song up for the person signed in. The subject comes
 * from the session; the agent is told whose request it is, not trusted to know.
 */
// Gateway and request timeouts: the agent's own deadline passing, as it reports it.
const REQUEST_TIMEOUT = 408;
const GATEWAY_TIMEOUT = 504;
const OUT_OF_TIME = new Set([REQUEST_TIMEOUT, GATEWAY_TIMEOUT]);

function outOfTime(error: unknown): boolean {
  return (
    error instanceof TimeoutError || (error instanceof HttpError && OUT_OF_TIME.has(error.status))
  );
}

export async function research(
  kind: unknown,
  query: unknown,
  locale: unknown,
): Promise<ResearchOutcome> {
  const subject = (await auth())?.user?.subject;
  const ask = researchFrom(kind, query, locale);

  if (!subject || !ask) {
    return { kind: "failed" };
  }

  try {
    const hits =
      ask.kind === "quotes"
        ? quoteHits(await researchClient.quotes(subject, ask))
        : songHits(await researchClient.songs(subject, ask));

    return { kind: "found", hits };
  } catch (error) {
    console.error("[research] could not look something up", error);

    return { kind: outOfTime(error) ? "slow" : "failed" };
  }
}
