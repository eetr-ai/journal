// Cards a reply can draw in the conversation, and the memory and birthdays a new
// one opens on.
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
  quote: {
    label: "Quote",
    add: "Add to entry",
    sent: "Sent ✓",
    source: "Open source",
  },
  lyrics: {
    label: "Song",
    add: "Add to entry",
    sent: "Sent ✓",
    source: "Full lyrics",
  },
  search: {
    label: "From your journal",
  },
  birthdays: {
    label: "Birthdays coming up",
    today: "Today",
    tomorrow: "Tomorrow",
    inDays: "In {days} days",
    turns: "turns {age}",
    talk: "Plan something",
    everyone: "See everyone",
  },
  // A tap, as the conversation shows it. The agent reads the tap itself.
  taps: {
    talk: "You chose to talk about the memory from {date}",
    write: "You started writing from the memory from {date}",
    open: "You opened the memory from {date}",
    birthdayTalk: "You asked for help with the birthday on {date}",
    quoteAdd: "You asked to add the quote by {by} to the entry",
    lyricsAdd: "You asked to add “{title}” by {by} to the entry",
  },
};

export type WidgetsDictionary = typeof widgets;

export default widgets;
