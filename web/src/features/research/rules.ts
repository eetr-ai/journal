import { isLocale, type Locale } from "@/i18n/config";
import { lyricsDirective, quoteDirective } from "@/features/widgets/directives";
import type { QuoteEntity, ResearchHit, ResearchKind, SongEntity } from "./types";

/**
 * What may be looked up, and which of what comes back may become a card, in
 * one place the search block and the server action both call.
 */

export const MAX_RESEARCH_CHARS = 200;

const KINDS: ResearchKind[] = ["quotes", "songs"];

export interface ResearchAsk {
  kind: ResearchKind;
  query: string;
  locale: Locale;
}

/** An ask as it may be sent, or null. Total: what reaches an action is unknown. */
export function researchFrom(kind: unknown, query: unknown, locale: unknown): ResearchAsk | null {
  if (!KINDS.includes(kind as ResearchKind) || typeof query !== "string") {
    return null;
  }

  const trimmed = query.trim();

  if (trimmed === "" || trimmed.length > MAX_RESEARCH_CHARS || !isLocale(String(locale))) {
    return null;
  }

  return { kind: kind as ResearchKind, query: trimmed, locale: locale as Locale };
}

// A card found twice is listed once, where it was first found.
function distinct(hits: ResearchHit[]): ResearchHit[] {
  return hits.filter(
    (hit, index) => hits.findIndex((other) => other.source === hit.source) === index,
  );
}

function separated(parts: (string | undefined)[]): string {
  return parts.filter((part) => part && part.trim() !== "").join(" · ");
}

/** The quotes the catalog would draw; the rest are dropped, not repaired. */
export function quoteHits(found: QuoteEntity[]): ResearchHit[] {
  return distinct(
    found.flatMap((quote) => {
      const source = quoteDirective(quote);

      return source
        ? [{ source, title: quote.text.trim(), detail: separated([quote.by, quote.source]) }]
        : [];
    }),
  );
}

export function songHits(found: SongEntity[]): ResearchHit[] {
  return distinct(
    found.flatMap((song) => {
      const source = lyricsDirective(song);
      const first = song.lines.find((line) => line.trim() !== "");

      return source
        ? [{ source, title: separated([song.title, song.by]), detail: first?.trim() ?? "" }]
        : [];
    }),
  );
}
