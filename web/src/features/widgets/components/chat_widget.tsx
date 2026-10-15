"use client";

import MemoryWidget from "./memory_widget";
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
    default:
      return null;
  }
}
