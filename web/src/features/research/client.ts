import "server-only";
import { RestClient } from "@eetr/ts-rest-utils";
import type { ResearchAsk } from "./rules";
import type { QuoteEntity, ResearchEntity, SongEntity } from "./types";

/**
 * The only thing in the app that knows how to ask the agent to look something
 * up on the web. Nothing personal travels: the query and the reader's language.
 */

const DEFAULT_AGENT_URL = "http://localhost:8080";
// A web search and a model reading what it found. Longer than the flow's own
// 60s deadline, so a slow answer is not turned into a failed one here.
const RESEARCH_TIMEOUT_MS = 70_000;
// Not retried: a second attempt is a second search and model call, paid for.
const RESEARCH_ATTEMPTS = 1;

let client: RestClient | undefined;

function agent(): RestClient {
  client ??= new RestClient({
    baseUrl: process.env.AGENT_URL ?? DEFAULT_AGENT_URL,
    timeoutMs: RESEARCH_TIMEOUT_MS,
    retry: { attempts: RESEARCH_ATTEMPTS },
    defaultInit: { cache: "no-store" },
  });

  return client;
}

async function research<T>(subject: string, ask: ResearchAsk): Promise<T[]> {
  const response = await agent().post<ResearchEntity<T>>(
    `/research/${encodeURIComponent(subject)}/${ask.kind}`,
    { query: ask.query, locale: ask.locale },
  );

  return response.getOrThrow().results ?? [];
}

export const researchClient = {
  quotes: (subject: string, ask: ResearchAsk) => research<QuoteEntity>(subject, ask),
  songs: (subject: string, ask: ResearchAsk) => research<SongEntity>(subject, ask),
};
