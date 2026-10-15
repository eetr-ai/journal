import type { WidgetsDictionary } from "./en_widgets";

const widgets: WidgetsDictionary = {
  memory: {
    label: "De tu diario",
    open: "Abrir entrada",
    talk: "Charlar sobre esto",
    write: "Escribir a partir de esto",
    another: "Otro recuerdo",
    opening: "Abriendo...",
    missing: "Esa entrada ya no está en tu diario.",
    failed: "Este recuerdo no se pudo abrir. Probá de nuevo en un momento.",
  },
  taps: {
    talk: "Elegiste charlar sobre el recuerdo del {date}",
    write: "Empezaste a escribir a partir del recuerdo del {date}",
    open: "Abriste el recuerdo del {date}",
    untitled: "Un recuerdo",
  },
};

export default widgets;
