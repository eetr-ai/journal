import type { ToolDictionary } from "./en_tools";

const tools: ToolDictionary = {
  read_profile: { running: "Recordando quién sos...", done: "Recordé quién sos" },
  read_today: { running: "Mirando la fecha...", done: "Miré la fecha" },
  write_entry: { running: "Escribiendo en tu diario...", done: "Escribí en tu diario" },
  find_entries: { running: "Buscando en tu diario...", done: "Busqué en tu diario" },
  read_entry: { running: "Leyendo una entrada...", done: "Leí una entrada" },
  recall_entry: {
    running: "Buscando dónde lo escribiste...",
    done: "Encontré dónde lo escribiste",
  },
  open_entry: { running: "Abriendo una entrada...", done: "Abrí una entrada" },
  search_books: { running: "Buscando el libro...", done: "Busqué el libro" },
  search_gutenberg: { running: "Buscando el pasaje...", done: "Encontré el pasaje" },
  search_scripture: { running: "Buscando el versículo...", done: "Encontré el versículo" },
  search_bronze_age_pervert: { running: "Leyendo a BAP...", done: "Leí a BAP" },
  search_lyrics: { running: "Buscando la letra...", done: "Encontré la letra" },
  load_skill: { running: "Ordenando las ideas...", done: "Ordené las ideas" },
  remember: { running: "Tomando nota...", done: "Tomé nota" },
  forget: { running: "Soltando eso...", done: "Solté eso" },
  search_memory: { running: "Haciendo memoria...", done: "Hice memoria" },
  other: { running: "Buscando algo...", done: "Busqué algo" },
};

export default tools;
