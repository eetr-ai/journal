import type { ToolDictionary } from "./en_tools";

const tools: ToolDictionary = {
  read_profile: {
    running: "Recordando quién sos...",
    done: "Recordé quién sos",
    failed: "No pude recordar quién sos",
  },
  read_today: {
    running: "Mirando la fecha...",
    done: "Miré la fecha",
    failed: "No pude mirar la fecha",
  },
  write_entry: {
    running: "Escribiendo en tu diario...",
    done: "Escribí en tu diario",
    failed: "No pude escribir en tu diario",
  },
  keep_image: {
    running: "Guardando tu foto...",
    done: "Guardé tu foto con el día",
    failed: "No pude guardar tu foto",
  },
  find_entries: {
    running: "Buscando en tu diario...",
    done: "Busqué en tu diario",
    failed: "No pude buscar en tu diario",
  },
  read_entry: {
    running: "Leyendo una entrada...",
    done: "Leí una entrada",
    failed: "No pude leer la entrada",
  },
  recall_entry: {
    running: "Buscando dónde lo escribiste...",
    done: "Encontré dónde lo escribiste",
    failed: "No encontré dónde lo escribiste",
  },
  open_entry: {
    running: "Abriendo una entrada...",
    done: "Abrí una entrada",
    failed: "No pude abrir la entrada",
  },
  arrange_page: {
    running: "Acomodando tu página...",
    done: "Acomodé tu página",
    failed: "No pude acomodar tu página",
  },
  search_books: {
    running: "Buscando el libro...",
    done: "Busqué el libro",
    failed: "No pude buscar el libro",
  },
  search_gutenberg: {
    running: "Buscando el pasaje...",
    done: "Encontré el pasaje",
    failed: "No encontré el pasaje",
  },
  search_scripture: {
    running: "Buscando el versículo...",
    done: "Encontré el versículo",
    failed: "No encontré el versículo",
  },
  search_bronze_age_pervert: {
    running: "Leyendo a BAP...",
    done: "Leí a BAP",
    failed: "No pude llegar a BAP",
  },
  search_lyrics: {
    running: "Buscando la letra...",
    done: "Encontré la letra",
    failed: "No encontré la letra",
  },
  load_skill: {
    running: "Ordenando las ideas...",
    done: "Ordené las ideas",
    failed: "No pude ordenar las ideas",
  },
  remember: { running: "Tomando nota...", done: "Tomé nota", failed: "No pude tomar nota" },
  forget: { running: "Soltando eso...", done: "Solté eso", failed: "No pude soltar eso" },
  search_memory: {
    running: "Haciendo memoria...",
    done: "Hice memoria",
    failed: "No pude hacer memoria",
  },
  find_people: {
    running: "Pensando en quién es...",
    done: "Pensé en quién es",
    failed: "No pude pensar en quién es",
  },
  read_person: {
    running: "Recordando a esa persona...",
    done: "Recordé a esa persona",
    failed: "No pude recordar a esa persona",
  },
  remember_person: {
    running: "Recordando quién es...",
    done: "Recordé quién es",
    failed: "No pude recordar quién es",
  },
  remember_fact: {
    running: "Teniéndolo presente...",
    done: "Lo tengo presente",
    failed: "No pude tenerlo presente",
  },
  forget_fact: {
    running: "Dejándolo ir...",
    done: "Lo dejé ir",
    failed: "No pude dejarlo ir",
  },
  upcoming_birthdays: {
    running: "Mirando si hay cumpleaños...",
    done: "Miré si hay cumpleaños",
    failed: "No pude mirar los cumpleaños",
  },
  other: { running: "Buscando algo...", done: "Busqué algo", failed: "No pude buscar eso" },
};

export default tools;
