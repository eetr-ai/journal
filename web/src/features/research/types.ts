/**
 * Looking a quote or a song up from the editor, on both sides of the agent
 * boundary. What the agent finds is a candidate; what reaches the browser is a
 * card the entry can keep.
 */

export type ResearchKind = "quotes" | "songs";

export interface QuoteEntity {
  text: string;
  by: string;
  source?: string;
  href?: string;
}

export interface SongEntity {
  title: string;
  by: string;
  lines: string[];
  href?: string;
}

export interface ResearchEntity<T> {
  results: T[];
}

/** One card that can go into the entry, with the two lines it is listed by. */
export interface ResearchHit {
  /** The directive the entry keeps. */
  source: string;
  title: string;
  detail: string;
}

export type ResearchOutcome = { kind: "found"; hits: ResearchHit[] } | { kind: "failed" };
