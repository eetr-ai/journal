// What the chat says while the journal uses each of its tools, keyed by the
// tool's own name. `other` is for a tool nobody has named here yet.
const tools = {
  read_profile: {
    running: "Remembering who you are...",
    done: "Remembered who you are",
    failed: "Could not remember who you are",
  },
  read_today: {
    running: "Checking the date...",
    done: "Checked the date",
    failed: "Could not check the date",
  },
  write_entry: {
    running: "Writing in your journal...",
    done: "Wrote in your journal",
    failed: "Could not write in your journal",
  },
  find_entries: {
    running: "Looking through your journal...",
    done: "Looked through your journal",
    failed: "Could not look through your journal",
  },
  read_entry: {
    running: "Reading an entry...",
    done: "Read an entry",
    failed: "Could not read the entry",
  },
  recall_entry: {
    running: "Finding where you wrote it...",
    done: "Found where you wrote it",
    failed: "Could not find where you wrote it",
  },
  open_entry: {
    running: "Opening an entry...",
    done: "Opened an entry",
    failed: "Could not open the entry",
  },
  search_books: {
    running: "Looking the book up...",
    done: "Looked the book up",
    failed: "Could not look the book up",
  },
  search_gutenberg: {
    running: "Finding the passage...",
    done: "Found the passage",
    failed: "Could not find the passage",
  },
  search_scripture: {
    running: "Finding the verse...",
    done: "Found the verse",
    failed: "Could not find the verse",
  },
  search_bronze_age_pervert: {
    running: "Reading BAP...",
    done: "Read BAP",
    failed: "Could not reach BAP",
  },
  search_lyrics: {
    running: "Looking up the lyrics...",
    done: "Looked up the lyrics",
    failed: "Could not find the lyrics",
  },
  load_skill: {
    running: "Gathering my thoughts...",
    done: "Gathered my thoughts",
    failed: "Could not gather my thoughts",
  },
  remember: {
    running: "Making a note of that...",
    done: "Made a note of that",
    failed: "Could not make a note of that",
  },
  forget: { running: "Letting that go...", done: "Let that go", failed: "Could not let that go" },
  search_memory: {
    running: "Thinking back...",
    done: "Thought back",
    failed: "Could not think back",
  },
  other: {
    running: "Looking something up...",
    done: "Looked something up",
    failed: "Could not look that up",
  },
};

export type ToolDictionary = typeof tools;

export default tools;
