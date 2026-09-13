import type { Locale } from "@/i18n/config";

/**
 * Placeholder content for the three panels. None of it is stored anywhere and
 * none of it is reachable from the rest of the app; it exists so the layout can
 * be judged with something in it. Delete a list the day its panel becomes real.
 */

export interface Transcript {
  id: string;
  title: string;
  when: string;
}

export interface EntrySummary {
  id: string;
  title: string;
  when: string;
}

export interface ChatMessage {
  id: string;
  from: "you" | "journal";
  text: string;
}

interface Samples {
  transcripts: Transcript[];
  entries: EntrySummary[];
  chat: ChatMessage[];
  today: string;
}

const samples: Record<Locale, Samples> = {
  en: {
    transcripts: [
      { id: "t1", title: "Why the release slipped", when: "Today" },
      { id: "t2", title: "Reading list for the winter", when: "Yesterday" },
      { id: "t3", title: "That conversation with Ana", when: "Tuesday" },
    ],
    entries: [
      { id: "e1", title: "A slow, good morning", when: "Today" },
      { id: "e2", title: "Ran the loop again", when: "Yesterday" },
      { id: "e3", title: "Rain, and nothing else", when: "Sunday" },
    ],
    chat: [
      { id: "c1", from: "journal", text: "Morning. What is on your mind?" },
      { id: "c2", from: "you", text: "Mostly the release. It slipped again." },
      {
        id: "c3",
        from: "journal",
        text: "That is the **second time** this month. Want to write down what got in the way, or talk it through first?",
      },
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
    transcripts: [
      { id: "t1", title: "Por qué se atrasó la release", when: "Hoy" },
      { id: "t2", title: "Lista de lectura para el invierno", when: "Ayer" },
      { id: "t3", title: "Esa charla con Ana", when: "Martes" },
    ],
    entries: [
      { id: "e1", title: "Una mañana lenta y buena", when: "Hoy" },
      { id: "e2", title: "Hice la vuelta otra vez", when: "Ayer" },
      { id: "e3", title: "Lluvia, y nada más", when: "Domingo" },
    ],
    chat: [
      { id: "c1", from: "journal", text: "Buen día. ¿Qué tenés en la cabeza?" },
      { id: "c2", from: "you", text: "Sobre todo la release. Se atrasó de nuevo." },
      {
        id: "c3",
        from: "journal",
        text: "Es la **segunda vez** este mes. ¿Querés anotar qué se interpuso, o charlarlo primero?",
      },
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
