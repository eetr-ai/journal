// What the chat says while the journal uses each of its tools, keyed by the
// tool's own name. `other` is for a tool nobody has named here yet.
const tools = {
  read_profile: { running: "Remembering who you are...", done: "Remembered who you are" },
  read_today: { running: "Checking the date...", done: "Checked the date" },
  write_entry: { running: "Writing in your journal...", done: "Wrote in your journal" },
  find_entries: { running: "Looking through your journal...", done: "Looked through your journal" },
  read_entry: { running: "Reading an entry...", done: "Read an entry" },
  recall_entry: { running: "Finding where you wrote it...", done: "Found where you wrote it" },
  open_entry: { running: "Opening an entry...", done: "Opened an entry" },
  search_books: { running: "Looking the book up...", done: "Looked the book up" },
  search_gutenberg: { running: "Finding the passage...", done: "Found the passage" },
  search_scripture: { running: "Finding the verse...", done: "Found the verse" },
  search_bronze_age_pervert: { running: "Reading BAP...", done: "Read BAP" },
  search_lyrics: { running: "Looking up the lyrics...", done: "Looked up the lyrics" },
  load_skill: { running: "Gathering my thoughts...", done: "Gathered my thoughts" },
  remember: { running: "Making a note of that...", done: "Made a note of that" },
  forget: { running: "Letting that go...", done: "Let that go" },
  search_memory: { running: "Thinking back...", done: "Thought back" },
  other: { running: "Looking something up...", done: "Looked something up" },
};

export type ToolDictionary = typeof tools;

export default tools;
