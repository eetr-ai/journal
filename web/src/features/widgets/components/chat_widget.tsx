"use client";

import LyricsWidget from "./lyrics_widget";
import MemoryWidget from "./memory_widget";
import QuoteWidget from "./quote_widget";
import SearchWidget from "./search_widget";
import type { Widget } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface ChatWidgetOptions {
  /** A widget as the reply's renderer checked it, as JSON. */
  encoded: string;
  t: Dictionary;
  locale: Locale;
}

function decoded(encoded: string): Widget | null {
  try {
    return JSON.parse(encoded) as Widget;
  } catch {
    return null;
  }
}

/** The catalog, as components. A widget is drawn here or not at all. */
export default function ChatWidget(options: ChatWidgetOptions) {
  const widget = decoded(options.encoded);

  switch (widget?.name) {
    case "memory":
      return <MemoryWidget id={widget.id} locale={options.locale} t={options.t} />;
    case "search":
      return <SearchWidget locale={options.locale} search={widget} t={options.t} />;
    case "quote":
      return <QuoteWidget quote={widget} t={options.t} />;
    case "lyrics":
      return <LyricsWidget lyrics={widget} t={options.t} />;
    default:
      return null;
  }
}
