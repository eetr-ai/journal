import type { EditorDictionary } from "./en_editor";

const editor: EditorDictionary = {
  titlePlaceholder: "Ponele un título al día",
  placeholder: "Escribí lo que pasó, o escribí / para un título, una lista o un aviso",
  save: {
    save: "Guardar",
    saving: "Guardando...",
    saved: "Guardado",
  },
  saveHint: "Guardar ahora (⌘S). También se guarda solo cuando hacés una pausa.",
  status: {
    failed:
      "No se pudo guardar. Lo que escribiste sigue acá: seguí escribiendo, o apretá ⌘S para intentarlo de nuevo.",
    titleTooLong: "El título es demasiado largo para guardarlo. Acortalo y se guarda solo.",
    contentTooLong: "Esta entrada es demasiado larga para guardarla. Dividila y se guarda sola.",
    pictures:
      "Una foto de acá no está guardada con esta entrada, así que no se pudo guardar. Las fotos se agregan desde la conversación.",
  },
  conflict: {
    body: "Esta entrada cambió en otro lado mientras escribías. Tus palabras siguen acá y no se guardó nada encima.",
    latest: "Cargar la última",
    mine: "Quedarme con la mía",
  },
  menu: {
    label: "Convertir este bloque en",
    none: "No hay coincidencias",
    text: "Texto",
    heading1: "Título",
    heading2: "Subtítulo",
    heading3: "Título pequeño",
    bullets: "Lista con viñetas",
    numbers: "Lista numerada",
    tasks: "Lista de tareas",
    quote: "Cita",
    callout: "Aviso",
    divider: "Separador",
    code: "Código",
  },
  remove: "Quitar esto",
};

export default editor;
