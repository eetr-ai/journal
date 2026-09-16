import type { Locale } from "@/i18n/config";

/**
 * Placeholder content for the panels that are still mocked. None of it is stored
 * anywhere and none of it is reachable from the rest of the app; it exists so
 * the layout can be judged with something in it. Delete a list the day its panel
 * becomes real — the chat's went when the chat did.
 */

export interface EntrySummary {
  id: string;
  title: string;
  when: string;
}

interface Samples {
  entries: EntrySummary[];
  today: string;
}

const samples: Record<Locale, Samples> = {
  en: {
    entries: [
      { id: "e1", title: "A slow, good morning", when: "Today" },
      { id: "e2", title: "Ran the loop again", when: "Yesterday" },
      { id: "e3", title: "Rain, and nothing else", when: "Sunday" },
    ],
    today: [
      "## A slow, good morning",
      "",
      "Woke up before the alarm for once. Coffee on the balcony, and the street was",
      "still quiet.",
      "",
      "- The release slipped again",
      "- Ana is back on Thursday",
      "- Still have not booked the thing",
    ].join("\n"),
  },
  es: {
    entries: [
      { id: "e1", title: "Una mañana lenta y buena", when: "Hoy" },
      { id: "e2", title: "Hice la vuelta otra vez", when: "Ayer" },
      { id: "e3", title: "Lluvia, y nada más", when: "Domingo" },
    ],
    today: [
      "## Una mañana lenta y buena",
      "",
      "Me desperté antes del despertador por una vez. Café en el balcón, y la calle",
      "todavía estaba tranquila.",
      "",
      "- La release se atrasó otra vez",
      "- Ana vuelve el jueves",
      "- Todavía no reservé eso",
    ].join("\n"),
  },
};

export function sampleContent(locale: Locale): Samples {
  return samples[locale];
}
