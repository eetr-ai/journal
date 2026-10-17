// Writing an entry by hand: the editor, what it says about saving, and the
// menu that turns one kind of block into another.
const editor = {
  titlePlaceholder: "Give the day a title",
  placeholder: "Write what happened, or type / for a heading, a list, a picture or a quote",
  save: {
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
  },
  // Also saves on its own a moment after you stop typing.
  saveHint: "Save now (⌘S). It also saves on its own when you pause.",
  status: {
    failed:
      "This could not be saved. What you wrote is still here — keep writing, or press ⌘S to try again.",
    titleTooLong: "The title is too long to save. Shorten it, and it saves on its own.",
    contentTooLong: "This entry is too long to save. Split it, and it saves on its own.",
    pictures:
      "A picture here is not one kept with this entry, so it could not be saved. Take it out and add it again.",
  },
  conflict: {
    body: "This entry changed somewhere else while you were writing. Your words are still here and nothing has been saved over.",
    latest: "Load the latest",
    mine: "Keep mine",
  },
  menu: {
    label: "Turn this block into",
    none: "Nothing matches",
    section: "Basic blocks",
    close: "Close menu",
    closeKey: "esc",
    search: "Type to search",
    text: "Text",
    heading1: "Heading",
    heading2: "Subheading",
    heading3: "Small heading",
    bullets: "Bulleted list",
    numbers: "Numbered list",
    tasks: "To-do list",
    quote: "Quote",
    callout: "Callout",
    divider: "Divider",
    code: "Code",
    picture: "Picture",
    quoteSearch: "Find a quote",
    songSearch: "Find a song",
  },
  // Blocks that hold a place while a picture is added or a card is looked for.
  slots: {
    picture: "Add a picture",
    pictureHint: "Or paste or drop one anywhere in the entry",
    uploading: "Adding the picture...",
    tryAgain: "Choose another",
    problems: {
      type: "That file is not a picture that can be kept. Try a PNG, JPEG or WebP.",
      tooLarge: "That picture is too large to keep, even made smaller.",
      tooMany: "Add one picture at a time here.",
      unreadable: "That picture could not be read. Try another.",
      unsaved:
        "The entry could not be saved yet, so the picture has nowhere to go. Try again in a moment.",
      failed: "The picture could not be added. Try again.",
    },
    quotes: "Quotes",
    songs: "Songs",
    findQuote: "A line, an author or a theme",
    findSong: "A title, an artist or a line you remember",
    searching: "Looking...",
    none: "Nothing found. Try other words.",
    failed: "The search could not be done. Try again.",
    hint: "Enter to search, arrows to choose, Enter to add, esc to close",
  },
  // A card or a table is kept as written: it can be taken out, not changed.
  remove: "Take this out",
};

export type EditorDictionary = typeof editor;

export default editor;
