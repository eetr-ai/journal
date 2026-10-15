// Cards a reply can draw in the conversation, and the memory a new one opens on.
const widgets = {
  memory: {
    label: "From your journal",
    open: "Open entry",
    talk: "Talk about this",
    write: "Write from this",
    another: "Another memory",
    opening: "Opening...",
    missing: "That entry isn't in your journal any more.",
    failed: "This memory could not be opened. Try again in a moment.",
  },
  // A tap, as the conversation shows it. The agent reads the tap itself.
  taps: {
    talk: "You chose to talk about the memory from {date}",
    write: "You started writing from the memory from {date}",
    open: "You opened the memory from {date}",
    // A conversation titled by a tap that was cut too short to read back.
    untitled: "A memory",
  },
};

export type WidgetsDictionary = typeof widgets;

export default widgets;
