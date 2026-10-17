import type { EditorDictionary } from "./en_editor";

const editor: EditorDictionary = {
  titlePlaceholder: "Ponele un título al día",
  placeholder: "Escribí lo que pasó, o escribí / para un título, una lista, una foto o una cita",
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
      "Una foto de acá no está guardada con esta entrada, así que no se pudo guardar. Sacala y agregala de nuevo.",
  },
  conflict: {
    body: "Esta entrada cambió en otro lado mientras escribías. Tus palabras siguen acá y no se guardó nada encima.",
    latest: "Cargar la última",
    mine: "Quedarme con la mía",
  },
  menu: {
    label: "Convertir este bloque en",
    none: "No hay coincidencias",
    section: "Bloques básicos",
    close: "Cerrar menú",
    closeKey: "esc",
    search: "Escribí para buscar",
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
    picture: "Foto",
    quoteSearch: "Buscar una cita",
    songSearch: "Buscar una canción",
  },
  slots: {
    picture: "Agregar una foto",
    pictureHint: "O pegala o arrastrala a cualquier parte de la entrada",
    uploading: "Agregando la foto...",
    tryAgain: "Elegir otra",
    problems: {
      type: "Ese archivo no es una foto que se pueda guardar. Probá con PNG, JPEG o WebP.",
      tooLarge: "Esa foto es demasiado grande para guardarla, incluso achicada.",
      tooMany: "Agregá una foto por vez acá.",
      unreadable: "No se pudo leer esa foto. Probá con otra.",
      unsaved:
        "La entrada todavía no se pudo guardar, así que la foto no tiene dónde ir. Probá de nuevo en un momento.",
      failed: "No se pudo agregar la foto. Probá de nuevo.",
    },
    quotes: "Citas",
    songs: "Canciones",
    findQuote: "Una frase, un autor o un tema",
    findSong: "Un título, un artista o una frase que recuerdes",
    searching: "Buscando...",
    none: "No se encontró nada. Probá con otras palabras.",
    failed: "No se pudo hacer la búsqueda. Probá de nuevo.",
    hint: "Enter para buscar, flechas para elegir, Enter para agregar, esc para cerrar",
  },
  remove: "Quitar esto",
};

export default editor;
